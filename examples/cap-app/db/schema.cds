namespace mockdataplugin.test.db;

using {
  cuid,
  managed,
  sap.common.CodeList,
  sap.common.Countries
} from '@sap/cds/common';

// Adding fields from @sap/cds/common to all entities to have extra fields/annotations in the mix

entity TestingAnnotation : cuid, managed {
  name       : String;
  sex        : String;
  creditCard : String;
  phone      : String;
  ipAddress  : String;
  email      : String;
  street     : String;
  country    : String;
};

entity TestingNoAnnotation : cuid, managed {
  extra : String;
};

entity TestingVirtual : cuid, CodeList {
  extra                : String;
  virtual extraVirtual : String;
};

entity TestingDraft : cuid, managed {
  extra : String;
};

entity TestingLocalized : cuid, Countries {
  extra : String;
};

entity TestingAssociation : cuid {
  extra      : String;
  to_cdstype : Association to TestingCdsTypes;
};

entity TestingCdsTypes {
  key fieldUUID        : UUID;
      fieldBoolean     : Boolean;
      fieldUInt8       : UInt8;
      fieldInt16       : Int16;
      fieldInt32       : Int32;
      fieldInteger     : Integer;
      fieldInt64       : Int64;
      fieldInteger64   : Integer64;
      fieldDecimal     : Decimal;
      fieldDouble      : Double;
      fieldDate        : Date;
      fieldTime        : Time;
      fieldDateTime    : DateTime;
      fieldTimestamp   : Timestamp;
      fieldString      : String;
      fieldBinary      : Binary;
      fieldLargeBinary : LargeBinary;
      fieldLargeString : LargeString;
};

entity TestingEnum : cuid {
  extra : String enum {
    LOW  = 'LOW';
    HIGH = 'HIGH';
  };
};
