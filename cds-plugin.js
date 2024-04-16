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
      const dest = resolve(cds.root, await getDefaultTargetFolder(cds.env));
      // const {force} = cds.cli.options;
      const force = true;
      let csn = await cds.compile(cds.env.roots, {min: true});
      includeExternalEntities(csn);
      csn = cds.reflect(csn); // reflected model (adds additional helper functions)
      const csnSQL = cds.compile.for.sql(csn, {names: cds.env.sql.names}); // CSN w/ persistence information
      for (const entity of csn.entities) {
        if (entity.query) {
          continue;
        }
        if (entity.name === 'DRAFT.DraftAdministrativeData' && entity.name.endsWith('.drafts')) {
          continue;
        }
        if (entity.name.endsWith('.texts')) {
          // continue;
        }
        if (!entity.name.includes('TestingLocalized')) {
          continue;
        }
        console.log(entity.name);
        await processEntity(entity, dest, csnSQL, force);
      }
    }
  };

  cds.add.register('mockdata', mockdataPlugin);
  module.exports = mockdataPlugin;
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
 * Check whether entity has annotated elements
 * @param {object} entityElements
 * @returns {boolean}
 */
function hasAnnotatedElement(entityElements) {
  for (const [key, element] of Object.entries(entityElements)) {
    if (isElementAnnotated(element)) {
      logger.debug('Annotation found in:', key);
      return true;
    }
  }
  return false;
}

/**
 * Check whether entity element is annotated
 * @param {object} element
 * @returns {boolean}
 */
function isElementAnnotated(element) {
  for (const key of Object.keys(element)) {
    if (isValidAnnotation(key)) {
      return true;
    }
  }
  return false;
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
 * Generate mock data based on the CDS data type
 * @param {string} cdsType
 * @param {number} length
 * @returns {any}
 */
function generateDataByType(cdsType, length) {
  let data;
  const maxLength = length || 255;
  switch (cdsType) {
    case 'cds.UUID':
      data = faker.string.uuid();
      break;
    case 'cds.Boolean':
      data = faker.datatype.boolean();
      break;
    case 'cds.UInt8':
      data = faker.number.int({min: 0, max: 255});
      break;
    case 'cds.Int16':
      data = faker.number.int({min: -32768, max: 32767});
      break;
    case 'cds.Int32':
      data = faker.number.int();
      break;
    case 'cds.Integer':
      data = faker.number.int();
      break;
    case 'cds.Int64':
      data = faker.number.bigInt();
      break;
    case 'cds.Integer64':
      data = faker.number.bigInt();
      break;
    case 'cds.Decimal':
      data = faker.number.float();
      break;
    case 'cds.Double':
      data = faker.number.float();
      break;
    case 'cds.Date':
      data = faker.date.anytime();
      break;
    case 'cds.Time':
      data = faker.date.anytime();
      break;
    case 'cds.DateTime':
      data = faker.date.anytime();
      break;
    case 'cds.Timestamp':
      data = faker.date.anytime();
      break;
    case 'cds.String':
      data = faker.lorem.words().substring(0, maxLength - 1);
      break;
    case 'cds.Binary':
      data = faker.string.binary({length: {max: maxLength}});
      break;
    case 'cds.LargeBinary':
      data = faker.string.binary({length: {max: maxLength}});
      break;
    case 'cds.LargeString':
      data = faker.lorem.words(20).substring(0, maxLength - 1);
      break;
    default:
      data = faker.lorem.words().substring(0, maxLength - 1);
      break;
  }
  return data;
}

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
 * Build the Faker method to be used
 * @param {cds.entity} element
 * @returns {object}
 */
function buildFakerMethod(element) {
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
function getFakerMethodNEW(element) {
  const method = buildFakerMethodByAnnotation(element);
  return method ? method() : buildFakerMethodByType(element.type, element.length);
}
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
 * @param {string} dest
 * @param {cds.link} csnSQL
 * @param {boolean} force
 */
async function processEntity(entity, dest, csnSQL, force) {
  let dataFileName = '';
  const namespace = getNamespace(csnSQL, entity.name);
  if (!namespace || namespace === entity.name) {
    dataFileName = `${entity.name}.csv`;
  } else {
    const entityName = entity.name.replace(namespace + '.', '');
    dataFileName = `${namespace}-${entityName}.csv`;
  }
  const dataFilePath = join(dest, dataFileName);
  const data = prepareDataFileContent(entity, csnSQL.definitions[entity.name]);
  await createDataFile(dataFilePath, dest, force, data);
}

/**
 * Get the default folder to save the generated files
 * @param {cds.env} env
 * @returns {string}
 */
async function getDefaultTargetFolder(env) {
  const {db} = env.folders;
  // csv files should be located in the 'db/data' folder unless a 'db/csv' folder already exists
  return join(db, await hasAccess(join(db, 'csv')) ? 'csv' : 'data');
}

/**
 * Create CSV files with mock data
 * @param {string} filename
 * @param {string} dest
 * @param {boolean} force
 * @param {string} dataFileContent
 */
async function createDataFile(filename, dest, force, dataFileContent) {
  let relativeFilePath = filename;
  const isFileExists = hasAccess(filename);
  if (filename.indexOf(cds.root) === 0) {
    // use relative path in log (for readability), only when data files are added within the project
    // (potentially can be located anywhere using the --out parameter)
    relativeFilePath = relative(cds.root, filename);
  }
  if (isFileExists && !force) {
    logger.info(`Skipping ${relativeFilePath}`);
  } else {
    // continue only if file not already exists, or '--force' option provided
    if (dataFileContent && dataFileContent.length) {
      if (!await hasAccess(dest)) {
        await mkdir(dest, {recursive: true});
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
  const data = []; // [...Array(TOTAL_ROWS).keys()];
  for (const [key, element] of Object.entries(entitySql.elements)) {
    if (!element['@cds.persistence.name']) {
      continue;
    }
    if (element instanceof cds.Association /* || element instanceof cds.Composition */) {
      //continue;
    }
    /* if (element.type === 'cds.Association' || element.type === 'cds.Composition') {
      continue;
    } */
    const entityElement = entity.elements[key];
    if (!entityElement) {
      continue;
    }
    let localdataNEW = [];
    if (entityElement.key) {
      localdataNEW = faker.helpers.uniqueArray(() => getFakerMethodNEW(entityElement), TOTAL_ROWS);
    } else {
      localdataNEW = faker.helpers.multiple(() => getFakerMethodNEW(entityElement), {count: TOTAL_ROWS});
    }
    for (let i = 0; i < TOTAL_ROWS; i++) {
      if (!data[i]) {
        data[i] = {};
      }
      data[i][key] = localdataNEW[i];
    }
  }
  return json2csv(data);
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

// module.exports = mockdataPlugin;
