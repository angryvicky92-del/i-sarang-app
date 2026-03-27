import fs from 'fs';

async function generate() {
  try {
    const res = await fetch('https://raw.githubusercontent.com/vuski/adong/master/adong.json');
    if (!res.ok) {
      console.log("adong.json not found");
      return;
    }
    const data = await res.json();
    console.log("Fetched!");
  } catch(e) {
    console.error(e);
  }
}
generate();
