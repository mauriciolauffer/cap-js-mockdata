# SAP CAP Mockdata Plugin

[![npm](https://img.shields.io/npm/v/cap-js-mockdata)](https://www.npmjs.com/package/cap-js-mockdata) [![test](https://github.com/mauriciolauffer/cap-js-mockdata/actions/workflows/test.yml/badge.svg)](https://github.com/mauriciolauffer/cap-js-mockdata/actions/workflows/test.yml)

A [SAP CAP plugin](https://cap.cloud.sap/docs/node.js/cds-plugins) to generate CSV files populated with mock data for testing.

This plugin uses [Faker](https://fakerjs.dev/) to generate meaningful mock data both automatically and through annotations.

## Setup

All you need to do is to install the plugin and add the `@Mockdata` annotations to your entities.

### Installation

Install the plugin as an npm module:

```shell
npm i -D cap-js-mockdata
```

### Annotation

The annotation tag is `@Mockdata`. You can add and combine all valid [Faker module APIs](https://fakerjs.dev/api/).

```js
// db/schema.cds

entity Customers : cuid, managed {
  name       String  @Mockdata: {person: 'fullName'};
  sex        String  @Mockdata: {person: 'sex'};
  creditCard String  @Mockdata: {finance: 'creditCardNumber'};
  phone      String  @Mockdata: {phone: 'number'};
  ipAddress  String  @Mockdata: {internet: 'ipv4'};
  email      String  @Mockdata: {internet: 'email'};
  street     String  @Mockdata: {location: 'streetAddress'};
  country    String  @Mockdata: {location: 'countryCode'};
};
```

### Using

Once you have installed the plugin and added the annotations, or not, you can execute the following command in a terminal:

```shell
cds add mockdata
```

The `cds add mockdata` command will create CSV files for every supported CDS Entity. The CSV files will be created into the `db/data` folder, the filenames will be something like `namespace-entityName.csv` and their content will look like:

|ID                                  |createdAt                                                 |createdBy      |modifiedAt                                                |modifiedBy             |name              |sex   |creditCard              |phone              |ipAddress      |email                        |street             |country                |
|------------------------------------|----------------------------------------------------------|---------------|----------------------------------------------------------|-----------------------|------------------|------|------------------------|-------------------|---------------|-----------------------------|-------------------|-----------------------|
|bef3c7b8-1232-4860-bded-efd51443e508|Sun Oct 06 2024 15:55:24 GMT-0300 (Brasilia Standard Time)|Julius_Hintz48 |Sun Nov 03 2024 14:38:56 GMT-0300 (Brasilia Standard Time)|Brain_Mosciski         |Edgar Langosh     |female|3564-4519-0923-7387     |801.226.6645 x01258|214.155.102.159|Marcellus.Fritsch@hotmail.com|640 Bramley Close  |Austria                |
|96ac7211-691a-4c2a-8fc0-0ae509693193|Thu Mar 28 2024 20:32:35 GMT-0300 (Brasilia Standard Time)|Clotilde_DAmore|Thu Nov 23 2023 10:49:44 GMT-0300 (Brasilia Standard Time)|Brendan.Corwin-Schinner|Erica McDermott   |male  |6567-6280-8822-5389-0611|(240) 938-1223     |37.230.118.100 |Shayne78@gmail.com           |1803 Feeney Park   |Cocos (Keeling) Islands|
|4fc525bc-e22b-4c55-a447-0e4c9fef1ffd|Fri Feb 09 2024 15:21:45 GMT-0300 (Brasilia Standard Time)|Lance78        |Fri Feb 14 2025 05:25:29 GMT-0300 (Brasilia Standard Time)|Donny_Blanda           |Joseph Lehner     |male  |4686210527760           |312-939-7109       |14.207.231.127 |Daija_Oberbrunner94@gmail.com|79422 Collin Divide|Portugal               |
|872b47a8-0bb1-47af-bc02-ef7290cff633|Sat Feb 22 2025 01:34:16 GMT-0300 (Brasilia Standard Time)|Mateo22        |Sun Sep 15 2024 18:42:41 GMT-0300 (Brasilia Standard Time)|Myrtle52               |Leigh Wintheiser I|male  |6759-2563-9161-5976     |553.277.9724 x231  |10.88.166.234  |Elyssa.Adams79@gmail.com     |139 Park Drive     |Macao                  |
