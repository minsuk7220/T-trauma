import { DatabaseSync } from 'node:sqlite';import fs from 'node:fs';
export function openDB(filename=':memory:'){
 const sql=new DatabaseSync(filename);sql.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');
 // Migration runner belongs to this standalone host, not request handling.
 sql.exec('CREATE TABLE IF NOT EXISTS _local_migrations(name TEXT PRIMARY KEY)');
 for(const name of fs.readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort()){
  if(!sql.prepare('SELECT name FROM _local_migrations WHERE name=?').get(name)){sql.exec('BEGIN');try{sql.exec(fs.readFileSync('drizzle/'+name,'utf8'));sql.prepare('INSERT INTO _local_migrations(name) VALUES(?)').run(name);sql.exec('COMMIT');}catch(e){sql.exec('ROLLBACK');throw e;}}
 }
 sql.exec('PRAGMA optimize;');
 function prepare(query,args=[]){return {bind(...values){return prepare(query,values)},async first(){return sql.prepare(query).get(...args)||null},async all(){return {results:sql.prepare(query).all(...args)}},async run(){const r=sql.prepare(query).run(...args);return {meta:{changes:Number(r.changes)}}}};}
 return {prepare,async batch(statements){sql.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sql.exec('COMMIT');return results;}catch(e){sql.exec('ROLLBACK');throw e;}},close(){sql.close()}};
}
