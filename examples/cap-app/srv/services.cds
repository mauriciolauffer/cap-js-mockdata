using {validatorplugin.test.db as db} from '../db/schema';

service ValidatorPluginService {
  entity Customers           as projection on db.Customers;
  entity TestingAssociation  as projection on db.TestingAssociation;
  entity TestingCdsTypes     as projection on db.TestingCdsTypes;
  entity TestingDraft        as projection on db.TestingDraft;
  entity TestingEnum         as projection on db.TestingEnum;
  // entity TestingLocalized    as projection on db.TestingLocalized;
  entity TestingNoAnnotation as projection on db.TestingNoAnnotation;
};

annotate ValidatorPluginService.TestingDraft with @odata.draft.enabled;
