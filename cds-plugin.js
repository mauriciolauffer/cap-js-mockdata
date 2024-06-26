'use strict';

const {access, writeFile, mkdir} = require('node:fs/promises');
const {resolve, join, relative} = require('node:path');
const {faker} = require('@faker-js/faker');
const {json2csv} = require('json-2-csv');
const cds = require('@sap/cds');
const logger = cds.log('mockdata-plugin');
const regxpAnnotationTag = new RegExp(`^@Mockdata.`);
const TOTAL_ROWS = 50;
let mockdataPlugin = null;

if (cds?.add?.Plugin && cds.add?.register) {
  mockdataPlugin = class MockdataTemplate extends cds.add.Plugin {
    async run() {
      const csn = await getCsn();
      const csnSQL = cds.compile.for.sql(csn, {names: cds.env.sql.names}); // CSN with persistence information
      for (const entity of csn.entities) {
        if (!isEntitySupported(entity)) {
          continue;
        }
        await processEntity(entity, csnSQL);
      }
    }
  };

  cds.add.register('mockdata', mockdataPlugin);
  module.exports = mockdataPlugin;
}

/**
 * Get CSN
 * @returns {object}
 */
async function getCsn() {
  let csn = await cds.compile(cds.env.roots, {min: true});
  csn = includeExternalEntities(csn);
  return cds.reflect(csn); // reflected model (adds additional helper functions)
}

/**
 * Determine whether the entity is supported or not
 * @param {cds.entity} entity
 * @returns {boolean}
 */
function isEntitySupported(entity) {
  if (entity.query) { // Only database tables
    return false;
  }
  if (entity.name === 'DRAFT.DraftAdministrativeData' && entity.name.endsWith('.drafts')) { // No drafts
    return false;
  }
  if (entity.drafts) { // No drafts
    return false;
  }
  if (entity.name.endsWith('.texts')) { // No localized texts
    return false;
  }
  return true;
}

/**
 * Determine whether the entity element is supported or not
 * @param {cds.entity} element
 * @param {cds.entity} elementSql
 * @returns {boolean}
 */
function isElementSupported(element, elementSql) {
  if (!element) { // No empty elements
    return false;
  }
  if (!elementSql?.['@cds.persistence.name']) { // Only fields persisted in database tables
    return false;
  }
  if (element.type === 'cds.Association' || element.type === 'cds.Composition') { // No Association nor Composition fields
    return false;
    // entityElement = entityElement.foreignKeys[element.keys[0]['as']];
  }
  return true;
}

/**
 * Check whether file/folder can be accessed
 * @param {string} path
 * @returns {boolean}
 */
async function hasAccess(path) {
  try {
    await access(path);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Check whether property is a valid annotation
 * @param {string} property
 * @returns {boolean}
 */
function isValidAnnotation(property) {
  return regxpAnnotationTag.test(property);
}

/**
 * Get the Faker method to be used
 * @param {cds.entity} element
 * @returns {any}
 */
function getFakerMethod(element) {
  const method = buildFakerMethodByAnnotation(element);
  return method ? method() : buildFakerMethodByType(element.type, element.length);
}

/**
 * Build the Faker method using CDS annotations
 * @param {string} cdsType
 * @param {number} length
 * @returns {any}
 */
function buildFakerMethodByType(cdsType, length) {
  const maxLength = length || 255;
  switch (cdsType) {
    case 'cds.UUID':
      return faker.string.uuid();
    case 'cds.Boolean':
      return faker.datatype.boolean();
    case 'cds.UInt8':
      return faker.number.int({min: 0, max: 255});
    case 'cds.Int16':
      return faker.number.int({min: -32768, max: 32767});
    case 'cds.Int32':
      return faker.number.int();
    case 'cds.Integer':
      return faker.number.int();
    case 'cds.Int64':
      return faker.number.bigInt();
    case 'cds.Integer64':
      return faker.number.bigInt();
    case 'cds.Decimal':
      return faker.number.float();
    case 'cds.Double':
      return faker.number.float();
    case 'cds.Date':
      return faker.date.anytime();
    case 'cds.Time':
      return faker.date.anytime();
    case 'cds.DateTime':
      return faker.date.anytime();
    case 'cds.Timestamp':
      return faker.date.anytime();
    case 'cds.String':
      return faker.lorem.words().substring(0, maxLength - 1);
    case 'cds.Binary':
      return faker.string.binary({length: {max: maxLength}});
    case 'cds.LargeBinary':
      return faker.string.binary({length: {max: maxLength}});
    case 'cds.LargeString':
      return faker.lorem.words(20).substring(0, maxLength - 1);
    case 'User':
      return faker.internet.userName().substring(0, maxLength - 1);
    default:
      return faker.lorem.words().substring(0, maxLength - 1);
  }
}

/**
 * Build the Faker method using CDS annotations
 * @param {cds.entity} element
 * @returns {object}
 */
function buildFakerMethodByAnnotation(element) {
  let obj = '';
  let method = '';
  const properties = Object.entries(element);
  for (const [key, value] of properties) {
    if (isValidAnnotation(key)) {
      obj = key.split('.')[1];
      method = value;
      break;
    }
  }
  return faker[obj]?.[method];
}

/**
 * Include extenal entities
 * @param {object} csn
 * @returns {object}
 */
function includeExternalEntities(csn) {
  for (const [key, definition] of Object.entries(csn.definitions)) {
    if (definition['@cds.persistence.skip'] === true) {
      logger.info('Including skipped entity ' + key);
      delete definition['@cds.persistence.skip'];
    }
  }
  return csn;
}

/**
 * Process CDS Entity to generate mock data
 * @param {cds.entity} entity
 * @param {cds.link} csnSQL
 */
async function processEntity(entity, csnSQL) {
  const namespace = getNamespace(csnSQL, entity.name);
  const path = await getDefaultTargetFolder(cds.env);
  const dataFilePath = getFilename(entity, namespace, path);
  const data = prepareDataFileContent(entity, csnSQL.definitions[entity.name]);
  await createDataFile(dataFilePath, path, data);
}

/**
 * Get the default folder to save the generated files
 * @param {cds.env} env
 * @returns {string}
 */
async function getDefaultTargetFolder(env) {
  const {db} = env.folders;
  // csv files should be located in the 'db/data' folder unless a 'db/csv' folder already exists
  const path = join(db, await hasAccess(join(db, 'csv')) ? 'csv' : 'data');
  return resolve(cds.root, path);
}

/**
 * Create CSV files with mock data
 * @param {string} filename
 * @param {string} path
 * @param {string} dataFileContent
 */
async function createDataFile(filename, path, dataFileContent) {
  let relativeFilePath = filename;
  const isFileExists = await hasAccess(filename);
  const {force} = cds.cli.options;
  if (filename.indexOf(cds.root) === 0) {
    // use relative path in log (for readability), only when data files are added within the project
    // (potentially can be located anywhere using the --out parameter)
    relativeFilePath = relative(cds.root, filename);
  }
  if (isFileExists && !force) {
    logger.info(`Skipping ${relativeFilePath}`);
  } else { // continue only if file not already exists, or '--force' option provided
    if (dataFileContent && dataFileContent.length) {
      if (!await hasAccess(path)) {
        await mkdir(path, {recursive: true});
      }
      await writeFile(filename, dataFileContent);
      isFileExists ? logger.info(`Overwriting ${relativeFilePath}`) : logger.info(`Creating ${relativeFilePath}`);
    }
  }
}

/**
 * Generate mock data to populate CSV file
 * @param {cds.entity} entity
 * @param {cds.entity} entitySql
 * @returns {string}
 */
function prepareDataFileContent(entity, entitySql) {
  const data = [];
  for (const [key, element] of Object.entries(entity.elements)) {
    if (!isElementSupported(element, entitySql.elements[key])) {
      continue;
    }
    const localdata = generateData(element);
    for (let i = 0; i < TOTAL_ROWS; i++) {
      if (!data[i]) {
        data[i] = {};
      }
      data[i][key] = localdata[i];
    }
  }
  return json2csv(data);
}

/**
 * Generate mock data for entity
 * @param {object} entityElement
 * @returns {object[]}
 */
function generateData(entityElement) {
  let localdata = [];
  if (entityElement.key) {
    localdata = faker.helpers.uniqueArray(() => getFakerMethod(entityElement), TOTAL_ROWS);
  } else {
    localdata = faker.helpers.multiple(() => getFakerMethod(entityElement), {count: TOTAL_ROWS});
  }
  return localdata;
}

/**
 * Get entity namespace
 * @param {object} csn
 * @param {string} artifactName
 * @returns {string}
 */
function getNamespace(csn, artifactName) {
  const parts = artifactName.split('.');
  let seen = parts[0];
  const art = csn.definitions[seen];

  // First step is not a namespace (we faked those in the CSN)
  // No subsequent step can be a namespace then
  if (art && art.kind !== 'namespace' && art.kind !== 'context') {
    return null;
  }

  const length = parts.length;
  for (let i = 1; i < length; i++) {
    // This was definitely a namespace so far
    const previousArtifactName = seen;
    seen = `${seen}.${parts[i]}`;
    // This might not be - if it isn't, return the result.
    const currentArtifact = csn.definitions[seen];
    if (currentArtifact && currentArtifact.kind !== 'namespace' && currentArtifact.kind !== 'context') {
      return previousArtifactName;
    }
  }
  // We came till here - so the full artifactName is a namespace
  return artifactName;
}

/**
 * Get filename
 * @param {cds.entity} entity
 * @param {string} namespace
 * @param {string} path
 * @returns {string}
 */
function getFilename(entity, namespace, path) {
  let filename = '';
  if (!namespace || namespace === entity.name) {
    filename = `${entity.name}.csv`;
  } else {
    const entityName = entity.name.replace(namespace + '.', '');
    filename = `${namespace}-${entityName}.csv`;
  }
  return join(path, filename);
}
