using {validatorplugin.test.db as db} from '../db/schema';

service ValidatorPluginService {
  entity Customers           as projection on db.Customers;
  entity TestingCdsTypes as projection on db.TestingCdsTypes;
  // entity TestingDraft as projection on db.TestingDraft;
  entity TestingEnum as projection on db.TestingEnum;
  entity TestingNoAnnotation as projection on db.TestingLocalized;
  //entity TestingWithAssociation as projection on db.TestingWithAssociation;
};

//annotate ValidatorPluginService.TestingDraft with @odata.draft.enabled;
