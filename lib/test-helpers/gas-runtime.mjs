import vm from "node:vm";
import crypto from "node:crypto";
import { readGasSource } from "./gas-source.mjs";

export class Sheet {
  constructor(name, rowCount=10, columnCount=49){this.name=name;this.maxRows=rowCount;this.maxColumns=columnCount;this.cells=Array.from({length:rowCount},()=>Array(columnCount).fill(''));}
  getName(){return this.name;}
  getMaxRows(){return this.maxRows;}
  getMaxColumns(){return this.maxColumns;}
  getLastRow(){for(let i=this.cells.length-1;i>=0;i--)if(this.cells[i].some(v=>v!==''))return i+1;return 0;}
  getRange(row,col,rows=1,cols=1){
    if(row+rows-1>this.maxRows||col+cols-1>this.maxColumns)throw new Error(`grid bounds: requested R${row}:R${row+rows-1} C${col}:C${col+cols-1}, available ${this.maxRows}x${this.maxColumns}`);
    const self=this; return {
      getValues(){return self.cells.slice(row-1,row-1+rows).map(a=>a.slice(col-1,col-1+cols));},
      getDisplayValues(){return this.getValues().map(a=>a.map(v=>String(v??'')));},
      getValue(){return this.getValues()[0][0];},
      setValues(values){values.forEach((a,i)=>a.forEach((v,j)=>self.cells[row-1+i][col-1+j]=v));return this;},
      setValue(v){return this.setValues([[v]]);},
      clearContent(){return this.setValues(Array.from({length:rows},()=>Array(cols).fill('')));},
      setBackground(){return this;},setFontWeight(){return this;},clearDataValidations(){return this;}
    };
  }
  insertRowsAfter(after,n){this.cells.splice(after,0,...Array.from({length:n},()=>Array(this.maxColumns).fill('')));this.maxRows+=n;}
  insertColumnsAfter(after,n){this.cells.forEach(row=>row.splice(after,0,...Array(n).fill("")));this.maxColumns+=n;}
  setFrozenRows(){}
}
export function createGas(project){
 const props=new Map([['ADMIN_ALLOWED_EMAILS','owner@example.test']]);let user='owner@example.test';
 const propertyApi={getProperty:k=>props.get(k)||null,setProperty(k,v){props.set(k,v);return this;},deleteProperty:k=>props.delete(k),getProperties:()=>Object.fromEntries(props)};
 const sandbox={Date,console,Logger:{log(){}},Session:{getActiveUser:()=>({getEmail:()=>user})},PropertiesService:{getScriptProperties:()=>propertyApi,getDocumentProperties:()=>null},LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},SpreadsheetApp:{flush(){}},Utilities:{getUuid:()=>crypto.randomUUID(),computeDigest:(_,s)=>[...crypto.createHash('sha256').update(s).digest()],base64EncodeWebSafe:b=>Buffer.from(b).toString('base64url'),DigestAlgorithm:{SHA_256:'SHA_256'},Charset:{UTF_8:'UTF_8'},formatDate(d,t,f){const parts=Object.fromEntries(new Intl.DateTimeFormat('sv-SE',{timeZone:t,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(d).map(p=>[p.type,p.value]));return f.replace(/'/g, "").replace('yyyy',parts.year).replace('MM',parts.month).replace('dd',parts.day).replace('HH',parts.hour).replace('mm',parts.minute).replace('ss',parts.second);}},ContentService:{MimeType:{JSON:'json'},createTextOutput(text){return {text,setMimeType(){return this;}}}}};
 vm.createContext(sandbox);vm.runInContext(readGasSource(project),sandbox);return {g:sandbox,props,setUser:u=>{user=u}};
}
