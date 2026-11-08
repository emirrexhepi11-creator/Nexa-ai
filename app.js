const landingScreen=document.getElementById("landing-screen");
const authScreen=document.getElementById("auth-screen");
const chatScreen=document.getElementById("chat-screen");
const authNote=document.getElementById("auth-note");
const emailForm=document.getElementById("email-form");
const phoneForm=document.getElementById("phone-form");
const phoneInput=document.getElementById("phone");
const phoneIti=window.intlTelInput&&phoneInput?window.intlTelInput(phoneInput,{
  initialCountry:"mk",
  separateDialCode:true,
  nationalMode:false,
  preferredCountries:["mk","al","xk","us","gb","de","ch"],
  loadUtils:()=>import("https://cdn.jsdelivr.net/npm/intl-tel-input@25.3.1/build/js/utils.js")
}):null;
const tabs=[...document.querySelectorAll(".tab")];
const messages=document.getElementById("messages");
const welcome=document.getElementById("welcome");
const input=document.getElementById("message-input");
const historyList=document.getElementById("history-list");
const HISTORY_STORAGE_KEY="nexa_ai_conversations_v1";
let conversations=[];
let activeConversation=[];
let guestMode=true;
let supabaseClient=null;
async function initializeGoogleLogin(){
  try {
    const response=await fetch("/api/auth-config",{cache:"no-store"});
    if(!response.ok)throw new Error("Configuration unavailable");
    const config=await response.json();
    if(!window.supabase?.createClient)throw new Error("Supabase library unavailable");
    supabaseClient=window.supabase.createClient(config.url,config.publishableKey,{
      auth:{flowType:"pkce",detectSessionInUrl:true,autoRefreshToken:true,persistSession:true}
    });
    const {data:{session},error}=await supabaseClient.auth.getSession();
    if(error)throw error;
    if(session?.user){
      enterChat(false);
      document.querySelector(".profile-btn span:nth-child(2)").textContent=session.user.email||"Google account";
    }
    supabaseClient.auth.onAuthStateChange((event,session)=>{
      if(event==="SIGNED_IN"&&session?.user){
        enterChat(false);
        document.querySelector(".profile-btn span:nth-child(2)").textContent=session.user.email||"Google account";
      }
    });
  }catch(error){
    console.warn("Google sign-in setup:",error.message);
  }
}


function saveConversations(){
  try{
    localStorage.setItem(HISTORY_STORAGE_KEY,JSON.stringify(conversations));
  }catch(error){
    console.warn("NEXA AI could not save conversation history:",error);
  }
}
function loadConversations(){
  try{
    const saved=JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY)||"[]");
    conversations=Array.isArray(saved)?saved.filter(item=>
      Array.isArray(item)&&item.every(message=>
        message&&["user","assistant"].includes(message.role)&&typeof message.text==="string"
      )
    ):[];
  }catch(error){
    conversations=[];
  }
}

function showScreen(screen){
  [landingScreen,authScreen,chatScreen].forEach(item=>item.classList.add("hidden"));
  screen.classList.remove("hidden");
}
function openAuth(){
  showScreen(authScreen);
  authNote.textContent="";
}
function enterChat(asGuest=true){
  guestMode=asGuest;
  showScreen(chatScreen);
  document.querySelector(".plan-label").innerHTML=asGuest?"NEXA AI <span>GUEST</span>":"NEXA AI <span>ACCOUNT</span>";
  document.querySelector(".profile-btn span:nth-child(2)").textContent=asGuest?"Guest account":"Account preview";
  input.focus();
}
document.getElementById("landing-login").addEventListener("click",openAuth);
document.getElementById("landing-signup").addEventListener("click",openAuth);
document.getElementById("hero-signin").addEventListener("click",openAuth);
document.getElementById("hero-start").addEventListener("click",()=>enterChat(true));
document.getElementById("auth-back").addEventListener("click",()=>showScreen(landingScreen));
document.getElementById("guest-btn").addEventListener("click",()=>enterChat(true));
document.getElementById("header-signin").addEventListener("click",openAuth);
document.getElementById("google-btn").addEventListener("click",async()=>{
  if(!supabaseClient){
    authNote.textContent="Google login is not configured yet. Check the Supabase connection and redeploy NEXA AI.";
    return;
  }
  authNote.textContent="Opening Google sign-in...";
  const {error}=await supabaseClient.auth.signInWithOAuth({
    provider:"google",
    options:{redirectTo:window.location.origin+window.location.pathname}
  });
  if(error)authNote.textContent="Google sign-in failed: "+error.message;
});
document.getElementById("apple-btn").addEventListener("click",async()=>{
  if(!supabaseClient){authNote.textContent="Account service unavailable.";return;}
  const {error}=await supabaseClient.auth.signInWithOAuth({
    provider:"apple",
    options:{redirectTo:window.location.origin+window.location.pathname}
  });
  if(error)authNote.textContent="Apple sign-in needs configuration: "+error.message;
});
emailForm.addEventListener("submit",async e=>{
  e.preventDefault();
  if(!supabaseClient){authNote.textContent="Account service is unavailable. Refresh and try again.";return;}
  const email=document.getElementById("email").value.trim();
  const password=document.getElementById("password").value;
  const action=document.getElementById("email-action").value;
  const button=emailForm.querySelector('button[type="submit"]');
  button.disabled=true;
  authNote.textContent=action==="signup"?"Creating your account...":"Signing in...";
  try{
    let result;
    if(action==="signup"){
      result=await supabaseClient.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin+"/"}});
    }else{
      result=await supabaseClient.auth.signInWithPassword({email,password});
    }
    if(result.error)throw result.error;
    if(result.data.session){
      enterChat(false);
    }else if(action==="signup"){
      authNote.textContent="Check your email for a confirmation link, then sign in.";
    }else{
      authNote.textContent="Please confirm your email address before signing in.";
    }
  }catch(error){authNote.textContent=error.message||"Email authentication failed.";}
  finally{button.disabled=false;}
});
let pendingPhone=null;
phoneForm.addEventListener("submit",async e=>{
  e.preventDefault();
  if(!supabaseClient){authNote.textContent="Account service is unavailable.";return;}
  if(!phoneIti){authNote.textContent="Phone selector unavailable. Refresh and try again.";return;}
  if(!phoneIti.isValidNumber()){authNote.textContent="Choose your country and enter a valid number.";return;}
  const phone=phoneIti.getNumber();
  const button=phoneForm.querySelector('button[type="submit"]');
  button.disabled=true;
  try{
    const {error}=await supabaseClient.auth.signInWithOtp({phone});
    if(error)throw error;
    pendingPhone=phone;
    document.getElementById("phone-verify-form").classList.remove("hidden");
    authNote.textContent="If SMS delivery is enabled, enter the code sent to your phone.";
  }catch(error){authNote.textContent=error.message||"Unable to send verification code.";}
  finally{button.disabled=false;}
});
document.getElementById("phone-verify-form").addEventListener("submit",async e=>{
  e.preventDefault();
  if(!pendingPhone||!supabaseClient)return;
  const token=document.getElementById("phone-otp").value.trim();
  const {data,error}=await supabaseClient.auth.verifyOtp({phone:pendingPhone,token,type:"sms"});
  if(error){authNote.textContent=error.message;return;}
  if(data.session){enterChat(false);}
});
tabs.forEach(tab=>tab.addEventListener("click",()=>{
  tabs.forEach(t=>t.classList.toggle("active",t===tab));
  const phone=tab.dataset.tab==="phone";
  emailForm.classList.toggle("hidden",phone);
  phoneForm.classList.toggle("hidden",!phone);
  authNote.textContent="";
}));
function renderHistory(){
  historyList.innerHTML="";
  if(!conversations.length){
    historyList.innerHTML='<p class="empty-history">Your conversations will appear here.</p>';
    return;
  }
  conversations.forEach(conversation=>{
    const button=document.createElement("button");
    button.className="history-item";
    const firstUserMessage=conversation.find(message=>message.role==="user");
    button.textContent=(firstUserMessage?.text||"New chat").slice(0,42);
    button.title=firstUserMessage?.text||"New chat";
    button.classList.toggle("active",conversation===activeConversation);
    button.addEventListener("click",()=>{
      activeConversation=conversation;
      renderHistory();
      renderMessages();
      document.getElementById("sidebar").classList.remove("open");
    });
    historyList.appendChild(button);
  });
}
function renderMessages(){
  messages.innerHTML="";
  welcome.classList.toggle("hidden",activeConversation.length>0);
  activeConversation.forEach(message=>{
    const row=document.createElement("div");
    row.className="message "+message.role;
    const bubble=document.createElement("div");
    bubble.className="bubble";
    bubble.textContent=message.text;
    row.appendChild(bubble);
    messages.appendChild(row);
  });
  const conversation=document.getElementById("conversation");
  conversation.scrollTop=conversation.scrollHeight;
}
async function sendMessage(text){
  const value=(text||input.value).trim();
  if(!value)return;
  if(!activeConversation.length){
    activeConversation=[];
    conversations.unshift(activeConversation);
  }

  activeConversation.push({role:"user",text:value});
  saveConversations();
  input.value="";
  input.disabled=true;
  const sendButton=document.querySelector(".send-btn");
  sendButton.disabled=true;
  renderMessages();
  renderHistory();

  const pendingMessage={role:"assistant",text:"NEXA AI is thinking..."};
  activeConversation.push(pendingMessage);
  renderMessages();

  try{
    const response=await fetch("/api/chat",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        messages:activeConversation
          .filter(message=>message!==pendingMessage)
          .map(message=>({role:message.role,content:message.text}))
      })
    });
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"The AI service could not respond.");
    pendingMessage.text=data.reply;
    saveConversations();
  }catch(error){
    pendingMessage.text="Sorry, NEXA AI could not connect. "+error.message;
    saveConversations();
  }finally{
    input.disabled=false;
    sendButton.disabled=false;
    renderMessages();
    renderHistory();
    input.focus();
  }
}
document.getElementById("chat-form").addEventListener("submit",e=>{
  e.preventDefault();
  sendMessage();
});
document.querySelectorAll(".suggestion").forEach(button=>{
  button.addEventListener("click",()=>sendMessage(button.dataset.prompt));
});
document.getElementById("home-btn").addEventListener("click",()=>{
  showScreen(landingScreen);
});
document.getElementById("history-btn").addEventListener("click",()=>{
  document.getElementById("history-list").scrollIntoView({behavior:"smooth",block:"nearest"});
});
document.getElementById("settings-btn").addEventListener("click",()=>{
  document.getElementById("settings-overlay").classList.remove("hidden");
});
document.getElementById("close-settings").addEventListener("click",()=>{
  document.getElementById("settings-overlay").classList.add("hidden");
});
document.getElementById("settings-overlay").addEventListener("click",event=>{
  if(event.target.id==="settings-overlay")event.currentTarget.classList.add("hidden");
});
document.getElementById("new-chat").addEventListener("click",()=>{
  activeConversation=[];
  renderHistory();
  renderMessages();
  input.focus();
});
document.getElementById("open-sidebar").addEventListener("click",()=>document.getElementById("sidebar").classList.add("open"));
document.getElementById("close-sidebar").addEventListener("click",()=>document.getElementById("sidebar").classList.remove("open"));
document.getElementById("attach-btn").addEventListener("click",()=>alert("File and photo uploads will be added after the storage service is connected."));
document.getElementById("upgrade-btn").addEventListener("click",()=>alert("NEXA AI Plus plans will be configured after the AI service and user accounts are connected."));
document.getElementById("profile-btn").addEventListener("click",()=>{
  if(guestMode)openAuth();
});
loadConversations();
renderHistory();
renderMessages();

initializeGoogleLogin();
