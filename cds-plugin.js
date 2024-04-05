'use strict';

// const fs = require('node:fs');
const {access} = require('node:fs/promises');
const {resolve, join, relative} = require('node:path');
const cds = require('@sap/cds');
const logger = cds.log('mockdata-plugin');
const regxpAnnotationTag = new RegExp(`^@Mockdata.`);
const {exists, fs} = cds.utils;
// const faker = require('@faker-js/faker');
const {faker} = require('@faker-js/faker');

let mockdataPlugin = null;
if (cds?.add?.Plugin && cds.add?.register) {
  mockdataPlugin = class MockdataTemplate extends cds.add.Plugin {
    requires() {
      // return ['data'];
    }

    async run() {
      console.log(222222222);
      const dest = resolve(cds.root, await getDefaultTargetFolder(cds.env));
      // const {force} = cds.cli.options;
      const force = true;
      let csn = await cds.compile(cds.env.roots, {min: true});
      includeExternalEntities(csn);
      const csnSQL = cds.compile.for.sql(csn, {names: cds.env.sql.names}); // CSN w/ persistence information
      const csnOdata = cds.compile.for.odata(csn);
      const csnx1 = cds.compile.to.sql(csn);
      const csnx2 = JSON.parse(cds.compile.to.json(csn));
      csn = cds.reflect(csn); // reflected model (adds additional helper functions)
      csn.all('entity')
          .filter((entity) => !entity.query) // exclude entities with queries (projection on, select from ...)
          .filter((entity) => !entity.query) // exclude entities with queries (projection on, select from ...)
          .filter((entity) => entity.name !== 'DRAFT.DraftAdministrativeData' && !entity.name.endsWith('.drafts')) // exclude draft stuff
          .filter((entity) => hasAnnotatedElement(entity.elements))
          .forEach((entity) => processEntity(entity, dest, csnSQL, force));
      console.log(99999999);
    }
  };

  cds.add.register('mockdata', mockdataPlugin);
}

/**
 *
 * @param {cds.env} env
 */
async function getDefaultTargetFolder(env) {
  const {db} = env.folders;
  // csv files should be located in the 'db/data' folder unless a 'db/csv' folder already exists
  let path = join(db, 'csv');
  try {
    await access(path);
  } catch (err) {
    path = join(db, 'data');
  }
  return path;
  // return join(db, exists(join(db, 'csv')) ? 'csv' : 'data');
}

/**
 * Check whether entity has annotated elements
 * @param {object} entityElements
 * @returns {boolean}
 */
function hasAnnotatedElement(entityElements) {
  for (const [key, elementProperties] of Object.entries(entityElements)) {
    if (isElementAnnotated(elementProperties)) {
      logger.debug('Annotation found in:', key);
      return true;
    }
  }
  return false;
}

/**
 * Check whether entity element is annotated
 * @param {object} elementProperties
 * @returns {boolean}
 */
function isElementAnnotated(elementProperties) {
  for (const key of Object.keys(elementProperties)) {
    if (regxpAnnotationTag.test(key)) {
      return true;
    }
  }
  return false;
}

/**
 *
 * @param csn
 */
function includeExternalEntities(csn) {
  for (const each in csn.definitions) {
    const def = csn.definitions[each];
    if (def['@cds.persistence.skip'] === true) {
      DEBUG?.('Including skipped entity ' + each);
      delete def['@cds.persistence.skip'];
    }
  }
  return csn;
}

/**
 *
 * @param spec
 */
function asRegex(spec) {
  if (typeof spec === 'string') {
    try {
      if (spec.match(/[\^$|*]/)) {
        return new RegExp(spec);
      } else { // no meta chars -> prefix semantics
        spec = spec.replace(/\./g, '\\.'); // escape dot
        return new RegExp('^' + spec + '.*');
      }
    } catch (err) {
      throw err.message; // user error, so cut off stack trace
    }
  }
  return /.*/;
}

/**
 *
 * @param entity
 * @param dest
 * @param csnSQL
 * @param force
 */
function processEntity(entity, dest, csnSQL, force) {
  console.log(444444444);
  // return;
  let dataFileName;
  const namespace = getNamespace(csnSQL, entity.name);
  if (!namespace || namespace == entity.name) {
    dataFileName = `${entity.name}.csv`;
  } else {
    const entityName = entity.name.replace(namespace + '.', '');
    dataFileName = `${namespace}-${entityName}.csv`;
  }

  if (entity.name.endsWith('.texts')) {
    // handle '.texts' entities (for localized elements) differently:
    // if there is already file exist with '_texts' (old cds versions) - overwrite this one (when --force is used)
    // otherwise use the new '.texts' format
    const dataFileNameOldFormat = dataFileName.replace('.texts.csv', '_texts.csv');
    const dataFilePathOldFormat = join(dest, dataFileNameOldFormat);
    if (exists(dataFilePathOldFormat)) {
      createDataFile(true, dataFilePathOldFormat, dest, force, entity);
      return;
    }
  }

  const dataFilePath = join(dest, dataFileName);
  // createDataFile(exists(dataFilePath), dataFilePath, dest, force, entity);
  createDataFile(exists(dataFilePath), dataFilePath, dest, force, entity, csnSQL.definitions[entity.name]);
}

/**
 *
 * @param env
 */
function getDefaultTargetFolderxxx(env) {
  const {db} = env.folders;
  // csv files should be located in the 'db/data' folder unless a 'db/csv' folder already exists
  return join(db, exists(join(db, 'csv')) ? 'csv' : 'data');
}


/**
 *
 * @param isFileExists
 * @param dataFilePath
 * @param dest
 * @param force
 * @param entity
 * @param entitySql
 */
function createDataFile(isFileExists, dataFilePath, dest, force, entity, entitySql) {
  let relFilePath = dataFilePath;
  if (dataFilePath.indexOf(cds.root) === 0) {
    // use relative path in log (for readability), only when data files are added within the project
    // (potentially can be located anywhere using the --out parameter)
    relFilePath = relative(cds.root, dataFilePath);
  }
  if (isFileExists && !force) {
    console.log(`Skipping ${relFilePath}`);
  } else {
    // continue only if file not already exists, or '--force' option provided
    const dataFileContent = prepareDataFileContent(entitySql);
    const dataFileContentx1 = prepareDataFileContentx1(entity, entitySql);
    if (dataFileContent && dataFileContent.length) {
      if (!exists(dest)) fs.mkdirSync(dest, {recursive: true});
      fs.writeFileSync(dataFilePath, dataFileContent);
      isFileExists ? console.log(`Overwriting ` + relFilePath) : console.log(`Creating ` + relFilePath);
    }
  }
}

/**
 *
 * @param entity
 */
function prepareDataFileContent(entity) {
  const persistenceKeyNames = Object.keys(entity.keys || []);
  return Object.entries(entity.elements)
      .filter(([, element]) => !(element instanceof cds.Association)) // exclude associations+compositions
      .filter(([, element]) => !!element['@cds.persistence.name']) // exclude no-persistence elements, e.g. virtual ones
      .map(([key]) => key)
      .sort((k1, k2) => { // sort with keys first
        if (persistenceKeyNames.includes(k1) && !persistenceKeyNames.includes(k2)) return -1;
        if (!persistenceKeyNames.includes(k1) && persistenceKeyNames.includes(k2)) return 1;
        return 0; // preserve original order otherwise
      })
      .join(','); // using comma as csv separator by default
}

/**
 *
 * @param entity
 * @param entitySql
 */
function prepareDataFileContentx1(entity, entitySql) {
  const data = [];
  const persistenceKeyNames = Object.keys(entitySql.keys || []);
  return Object.entries(entitySql.elements)
      .filter(([, element]) => { // exclude associations+compositions
        return !(element instanceof cds.Association);
      })
      .filter(([, element]) => { // exclude no-persistence elements, e.g. virtual ones
        return !!element['@cds.persistence.name'];
      })
      .map(([key]) => {
        return key;
      })
      .sort((k1, k2) => { // sort with keys first
        if (persistenceKeyNames.includes(k1) && !persistenceKeyNames.includes(k2)) return -1;
        if (!persistenceKeyNames.includes(k1) && persistenceKeyNames.includes(k2)) return 1;
        return 0; // preserve original order otherwise
      })
      .map((key) => {
        data[key] = [];
        const fieldData = [];
        let fakerMethod = {};
        if (isElementAnnotated(entity.elements[key])) {
          fakerMethod = faker.person.sex;
        } else {
          fakerMethod = faker.person.fullName;
        }
        for (let i = 0; i < 50; i++) {
          fieldData.push(fakerMethod());
        }
        data[key] = [...fieldData];
        return key;
      }) // exclude no-persistence elements, e.g. virtual ones
      .join(','); // using comma as csv separator by default
}

// Logic is taken from cds-compile
/**
 *
 * @param csn
 * @param artifactName
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


  for (let i = 1; i < parts.length; i++) {
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


module.exports = mockdataPlugin;
