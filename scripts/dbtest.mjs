import 'dotenv/config'
import pg from 'pg'
const ref=process.env.SUPABASE_PROJECT_REF, pw=process.env.SUPABASE_DB_PASSWORD
const regions=['eu-central-1','eu-west-1','eu-west-2','eu-north-1','me-central-1','ap-south-1','ap-southeast-1','us-east-1','us-east-2','us-west-1','ap-northeast-1','ap-southeast-2','sa-east-1','ca-central-1','eu-west-3','me-south-1']
const targets=[{name:'direct',host:`db.${ref}.supabase.co`,port:5432,user:'postgres'}]
for(const r of regions) for(const p of ['aws-0','aws-1']) targets.push({name:`${p}-${r}`,host:`${p}-${r}.pooler.supabase.com`,port:5432,user:`postgres.${ref}`})
for(const t of targets){
  const c=new pg.Client({host:t.host,port:t.port,user:t.user,password:pw,database:'postgres',ssl:{rejectUnauthorized:false},connectionTimeoutMillis:5000})
  try{await c.connect();const r=await c.query('select version()');console.log('OK',t.name,t.host,r.rows[0].version.slice(0,30));await c.end();break}
  catch(e){console.log('x',t.name,e.message.slice(0,60))}
}
