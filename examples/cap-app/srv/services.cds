using {validatorplugin.test.db as db} from '../db/schema';

service ValidatorPluginService {
  entity Customers           as projection on db.Customers;
  entity CustomersNoAnnotation as projection on db.CustomersNoAnnotation;
};
