namespace validatorplugin.test.db;

using {
  cuid,
  managed,
  sap.common.CodeList
} from '@sap/cds/common';

// Adding fields from @sap/cds/common to all entities to have extra fields/annotations in the mix

entity Customers : cuid, managed {
  name              : String;
  field_Integer     : Integer;
  virtual vSomething : String;
};

entity CustomersNoAnnotation : cuid, managed, CodeList {
  name : String;
};
