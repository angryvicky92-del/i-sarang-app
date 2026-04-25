import fs from 'fs';

async function generate() {
  const sidos = ['11', '26', '27', '28', '29', '30', '31', '36', '41', '42', '43', '44', '45', '46', '47', '48', '50', '51'];
  
  const sigunguDict = {};
  
  const promises = sidos.map(async (sido) => {
    try {
      const res = await fetch(`https://grpc-proxy-server-mkvo6j4wsq-du.a.run.app/v1/regcodes?regcode_pattern=${sido}*00000`);
      const data = await res.json();
      
      const list = [];
      for (const item of data.regcodes) {
        // Exclude SIDO itself (ends with 00000000)
        if (item.code.substring(2) === '00000000') continue;
        
        // Exclude general districts in distinct cities if you want, but childcare API usually expects standard sigungu
        
        const fullSigunguName = item.name.split(' ').slice(1).join(' ');
        const sigunguCode = item.code.substring(0, 5);
        
        // Only add unique ones (e.g. Suwon has multiple distinct districts, but 41110 is Suwon)
        if (!list.find(x => x.code === sigunguCode)) {
          list.push({
            name: fullSigunguName,
            code: sigunguCode
          });
        }
      }
      
      sigunguDict[sido] = list;
    } catch (e) {
      console.error(e);
    }
  });
  
  await Promise.all(promises);
  
  let out = "export const SIGUNGU_LIST = {\n";
  for (const sido of sidos) {
    if (!sigunguDict[sido]) continue;
    out += `  '${sido}': [\n`;
    const lines = sigunguDict[sido].map(s => `    { name: '${s.name}', code: '${s.code}' }`);
    out += lines.join(',\n') + '\n';
    out += `  ],\n`;
  }
  out += "};\n";
  
  fs.writeFileSync('sigungu_full.js', out);
  console.log("Success! Generated sigungu_full.js with total lines:", out.split('\n').length);
}

generate();
