using {validatorplugin.test.db as db} from '../db/schema';

service ValidatorPluginService {
  entity TestingAnnotation   as projection on db.TestingAnnotation;
  entity TestingNoAnnotation as projection on db.TestingNoAnnotation;
  entity TestingAssociation  as projection on db.TestingAssociation;
  entity TestingCdsTypes     as projection on db.TestingCdsTypes;
  entity TestingDraft        as projection on db.TestingDraft;
  entity TestingEnum         as projection on db.TestingEnum;
  entity TestingLocalized    as projection on db.TestingLocalized;
  entity TestingVirtual      as projection on db.TestingVirtual;
};

annotate ValidatorPluginService.TestingDraft with @odata.draft.enabled;
