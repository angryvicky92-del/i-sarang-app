import fs from 'fs';
import { DOMParser } from '@xmldom/xmldom';

const t0 = Date.now();
const res = await fetch('http://api.childcare.go.kr/sgn/app/cns/cnsa/api/api/v1/openapi/cpmsapi030?key=3813cbfbc6154d89a66993a4659eb8f0&arcode=11680');
const xml = await res.text();
const t1 = Date.now();
console.log(`Fetch: ${t1 - t0}ms, Length: ${xml.length}`);

const doc = new DOMParser().parseFromString(xml, "text/xml");
const items = doc.getElementsByTagName("item");
const t2 = Date.now();
console.log(`Parse: ${t2 - t1}ms, Items: ${items.length}`);
