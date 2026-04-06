# Packeta API - Getting Started Reference

Source: https://docs.packeta.com/docs/getting-started/packeta-api

## Overview

Packeta provides an API using either SOAP protocol or REST with XML request bodies. Both options function identically.

Contact: integrations@packeta.com

## Authentication

- All API calls require an **API password** (32-character hex string) as the first parameter
- Example: `1234567890abcdef1234567890abcdef`

## SOAP Interface

- **WSDL**: https://www.zasilkovna.cz/api/soap.wsdl
- **WSDL for PHP (32bit)**: https://www.zasilkovna.cz/api/soap-php-bugfix.wsdl
  - The bugfix WSDL replaces `unsignedLong` with `string` to avoid 64bit integer issues on 32bit PHP systems

**Warning**: Packet IDs must be handled as `string`, not `signedInt`, as the standard signed int may be incapable of holding the value.

### SOAP Usage (PHP)

```php
$gw = new SoapClient("https://www.zasilkovna.cz/api/soap.wsdl");
$apiPassword = "1234567890abcdef1234567890abcdef";
try {
    $packet = $gw->createPacket($apiPassword, array(
        'number' => "123456",
        'name' => "John",
        'surname' => "Doe",
        'email' => "example@packetatest.com",
        'phone' => "+420777123456",
        'addressId' => 79,
        'cod' => 145.55,
        'value' => 145.55,
        'weight' => 2,
        'eshop' => "MyEshop"
    ));
} catch (SoapFault $e) {
    var_dump($e->detail);
}
```

### SOAP Usage (C#)

```csharp
Packeta.PacketaClient gw = new PacketaClient();
string apiPassword = "1234567890abcdef1234567890abcdef";
PacketAttributes attrs = new PacketAttributes();
attrs.number = "123456";
attrs.name = "John";
attrs.surname = "Doe";
attrs.email = "example@packetatest.com";
attrs.phone = "+420777123456";
attrs.addressId = 79;
attrs.cod = 145.55;
attrs.value = 145.55;
attrs.weight = 2;
attrs.eshop = "MyEshop";
try {
    PacketIdDetail packet = gw.createPacket(apiPassword, attrs);
} catch (FaultException<PacketAttributesFault> e) {
    // process error
}
```

## REST/XML Interface

- **API URL**: https://www.zasilkovna.cz/api/rest
- **Method**: POST with XML document body
- **Root element**: name of the desired API method
- **Subelements**: method arguments

### REST/XML Request Example

```xml
<createPacket>
    <apiPassword>__API_PASSWORD__</apiPassword>
    <packetAttributes>
        <number>123456</number>
        <name>John</name>
        <surname>Doe</surname>
        <email>example@packetatest.com</email>
        <phone>+420777123456</phone>
        <addressId>79</addressId>
        <cod>145.55</cod>
        <value>145.55</value>
        <weight>2</weight>
        <eshop>MyEshop</eshop>
    </packetAttributes>
</createPacket>
```

### Response Format

The response root element carries the name of the return type (same XML structure pattern as the request).

## Testing

- You can use your standard account for testing -- no charges for packets not physically dispatched
- A separate test account can be created in the Client section
