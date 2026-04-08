import { XMLParser } from 'fast-xml-parser';

const API_KEY = '3813cbfbc6154d89a66993a4659eb8f0';
const res = await fetch(`http://api.childcare.go.kr/sgn/app/cns/cnsa/api/api/v1/openapi/cpmsapi030?key=${API_KEY}&arcode=11680`);
const xml = await res.text();

const t0 = Date.now();
const parser = new XMLParser({ ignoreAttributes: true });
const result = parser.parse(xml);
console.log(`Parsed in ${Date.now() - t0}ms`);

let itemsArray = [];
if (result?.response?.item) {
    itemsArray = Array.isArray(result.response.item) ? result.response.item : [result.response.item];
} else if (result?.response?.body?.item) {
    itemsArray = Array.isArray(result.response.body.item) ? result.response.body.item : [result.response.body.item];
} else if (result?.response?.body?.items?.item) {
    itemsArray = Array.isArray(result.response.body.items.item) ? result.response.body.items.item : [result.response.body.items.item];
} else if (result?.attribute?.item) {
    itemsArray = Array.isArray(result.attribute.item) ? result.attribute.item : [result.attribute.item];
} else {
    // maybe result itself has item
    for (const key of Object.keys(result)) {
        if (result[key]?.item) itemsArray = Array.isArray(result[key].item) ? result[key].item : [result[key].item];
    }
}
console.log(`Found ${itemsArray.length} items`);
console.log("Sample:", itemsArray[0]?.crname || itemsArray[0]?.CRNAME);
