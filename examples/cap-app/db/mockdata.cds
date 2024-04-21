using {mockdataplugin.test.db as db} from './schema';

annotate db.TestingAnnotation with {
  name       @Mockdata: {person: 'fullName'};
  sex        @Mockdata: {person: 'sex'};
  creditCard @Mockdata: {finance: 'creditCardNumber'};
  phone      @Mockdata: {phone: 'number'};
  ipAddress  @Mockdata: {internet: 'ipv4'};
  email      @Mockdata: {internet: 'email'};
  street     @Mockdata: {location: 'streetAddress'};
  country    @Mockdata: {location: 'countryCode'};
};
