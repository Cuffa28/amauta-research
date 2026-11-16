import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { canReadResearch } from "./research-access";

export const privateResearchHeaders = { "Cache-Control": "private, no-store", Vary: "Authorization" };
export async function researchClient(request: NextRequest) {
 const fail = (error: string, status: number) => ({ ok: false as const, response: NextResponse.json({ error }, { status, headers: privateResearchHeaders }) });
 const token = request.headers.get("authorization")?.match(/^Bearer (\S+)$/)?.[1];
 if (!token) return fail("Iniciá sesión para consultar research.",401);
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if (!url || !key) return fail("La conexión del portal no está configurada.",503);
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${token}`}}});
 const {data:auth,error}=await db.auth.getUser(token);
 if(error||!auth.user?.email)return fail("La sesión venció. Ingresá nuevamente.",401);
 if(!canReadResearch(auth.user.email))return fail("Tu cuenta no tiene acceso a Research.",403);
 const {data:member,error:memberError}=await db.from("team_members").select("email").eq("email",auth.user.email.toLowerCase()).eq("active",true).maybeSingle();
 if(memberError||!member)return fail("Tu usuario no tiene acceso al research del equipo.",403);
 return {ok:true as const,db};
}
