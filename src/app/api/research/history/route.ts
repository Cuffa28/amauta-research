import { NextRequest, NextResponse } from "next/server";
import { researchClient,privateResearchHeaders as headers } from "@/lib/research-server";
import { historyCatalog,historyPoints,type HistoryRow } from "@/lib/research-history";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
 try{
  const access=await researchClient(request);if(!access.ok)return access.response;
  const key=request.nextUrl.searchParams.get("series")||historyCatalog[0].key;
  const meta=historyCatalog.find(s=>s.key===key);
  if(!meta)return NextResponse.json({error:"Serie no válida."},{status:400,headers});
  const {data,error}=await access.db.from("research_observations")
   .select("id,observed_on,value,unit,provider,evidence_class,methodology,source_url,retrieved_at,data_status")
   .eq("series_key",key).eq("data_status","observed").order("observed_on",{ascending:false}).order("retrieved_at",{ascending:false}).order("id",{ascending:false}).limit(2000);
  if(error)return NextResponse.json({error:"No se pudo consultar la base histórica."},{status:503,headers});
  const first=data?.[0];
  return NextResponse.json({series:first?{id:key,name:meta.label,unit:meta.unit,provider:first.provider,sourceUrl:first.source_url,retrievedAt:first.retrieved_at,note:first.methodology,derived:first.evidence_class==="derived",retained:false,points:historyPoints(data as HistoryRow[])}:null},{headers});
 }catch{return NextResponse.json({error:"No se pudo consultar la base histórica."},{status:503,headers});}
}
