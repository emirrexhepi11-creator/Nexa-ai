const authScreen=document.getElementById("auth-screen");
const chatScreen=document.getElementById("chat-screen");
const authNote=document.getElementById("auth-note");
const emailForm=document.getElementById("email-form");
const phoneForm=document.getElementById("phone-form");
const tabs=[...document.querySelectorAll(".tab")];
const messages=document.getElementById("messages");
const welcome=document.getElementById("welcome");
const input=document.getElementById("message-input");
const historyList=document.getElementById("history-list");
let conversations=[];
let activeConversation=[];
let guestMode=false;

function enterChat(asGuest=false){
  guestMode=asGuest;
  authScreen.classList.add("hidden");
  chatScreen.classList.remove("hidden");
  document.querySelector(".plan-label").innerHTML=asGuest?"NEXA AI <span>GUEST</span>":"NEXA AI <span>ACCOUNT</span>";
  document.querySelector(".profile-btn span:nth-child(2)").textContent=asGuest?"Guest account":"Signed-in preview";
}
document.getElementById("guest-btn").addEventListener("click",()=>enterChat(true));
document.getElementById("header-signin").addEventListener("click",()=>{
  chatScreen.classList.add("hidden");authScreen.classList.remove("hidden");
});
document.getElementById("google-btn").addEventListener("click",()=>authNote.textContent="Google sign-in will be connected when authentication is configured.");
document.getElementById("apple-btn").addEventListener("click",()=>authNote.textContent="Apple sign-in will be connected when authentication is configured.");
emailForm.addEventListener("submit",e=>{e.preventDefault();authNote.textContent="Email registration and sign-in will be connected to the secure account system in the next stage.";});
phoneForm.addEventListener("submit",e=>{e.preventDefault();authNote.textContent="SMS verification will be enabled after an SMS provider is configured.";});
tabs.forEach(tab=>tab.addEventListener("click",()=>{
  tabs.forEach(t=>t.classList.toggle("active",t===tab));
  const phone=tab.dataset.tab==="phone";
  emailForm.classList.toggle("hidden",phone);phoneForm.classList.toggle("hidden",!phone);
  authNote.textContent="";
}));
function renderHistory(){
  historyList.innerHTML="";
  if(!conversations.length){historyList.innerHTML='<p class="empty-history">Your conversations will appear here.</p>';return;}
  conversations.forEach((conversation,index)=>{
    const button=document.createElement("button");button.className="history-item";
    button.textContent=conversation[0]?.text||"New chat";
    button.addEventListener("click",()=>{activeConversation=conversation;renderMessages();});
    historyList.appendChild(button);
  });
}
function renderMessages(){
  messages.innerHTML="";
  welcome.classList.toggle("hidden",activeConversation.length>0);
  activeConversation.forEach(message=>{
    const row=document.createElement("div");row.className="message "+message.role;
    const bubble=document.createElement("div");bubble.className="bubble";bubble.textContent=message.text;
    row.appendChild(bubble);messages.appendChild(row);
  });
  document.getElementById("conversation").scrollTop=document.getElementById("conversation").scrollHeight;
}
function sendMessage(text){
  const value=(text||input.value).trim();if(!value)return;
  if(!activeConversation.length){activeConversation=[];conversations.unshift(activeConversation);}
  activeConversation.push({role:"user",text:value});
  activeConversation.push({role:"assistant",text:"Thanks for trying NEXA AI. The chat interface is ready; the AI engine will be connected in the next development stage."});
  input.value="";renderMessages();renderHistory();
}
document.getElementById("chat-form").addEventListener("submit",e=>{e.preventDefault();sendMessage();});
document.querySelectorAll(".suggestion").forEach(button=>button.addEventListener("click",()=>sendMessage(button.dataset.prompt)));
document.getElementById("new-chat").addEventListener("click",()=>{activeConversation=[];renderMessages();input.focus();});
document.getElementById("open-sidebar").addEventListener("click",()=>document.getElementById("sidebar").classList.add("open"));
document.getElementById("close-sidebar").addEventListener("click",()=>document.getElementById("sidebar").classList.remove("open"));
document.getElementById("attach-btn").addEventListener("click",()=>alert("File and photo uploads will be added in the next development stage."));
document.getElementById("upgrade-btn").addEventListener("click",()=>alert("NEXA AI Plus plans will be added after the AI service and accounts are connected."));
document.getElementById("profile-btn").addEventListener("click",()=>{if(guestMode){chatScreen.classList.add("hidden");authScreen.classList.remove("hidden");}});
renderMessages();