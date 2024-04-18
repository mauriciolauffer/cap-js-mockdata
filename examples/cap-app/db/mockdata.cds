using {validatorplugin.test.db as db} from './schema';

annotate db.Customers with {
  name @Mockdata: {person: 'fullName'};
  sex @Mockdata: {person: 'sex'}
};
