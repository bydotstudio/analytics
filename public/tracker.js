(function(){
  var s=document.currentScript,i=s&&s.getAttribute("data-site-id");
  if(!i)return;
  var a=s.getAttribute("data-api")||"",u=a+"/api/track";

  // In-memory session ID — survives SPA navigation within the tab, resets on hard reload.
  // No localStorage, no cookies — zero client-side persistent storage.
  var d=typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)+Date.now();

  // Extract UTM parameters from the current URL
  function utms(search){
    var p=new URLSearchParams(search);
    return{utm_source:p.get("utm_source")||"",utm_medium:p.get("utm_medium")||"",utm_campaign:p.get("utm_campaign")||""};
  }

  function send(url,body){
    var b=JSON.stringify(body);
    navigator.sendBeacon?navigator.sendBeacon(url,new Blob([b],{type:"application/json"})):fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:b,keepalive:!0}).catch(function(){});
  }

  function t(p,r){
    var u2=Object.assign({siteId:i,pathname:p,referrer:r||document.referrer,sessionId:d},utms(location.search));
    send(u,u2);
  }

  t(location.pathname,document.referrer);

  var h=history.pushState;
  history.pushState=function(){h.apply(this,arguments);t(location.pathname,"");};

  // Rage click detection: 3+ rapid clicks on the same target within 600ms
  var _rc={el:null,t:0,n:0};
  document.addEventListener("click",function(e){
    var now=Date.now();
    if(e.target===_rc.el&&now-_rc.t<600){
      _rc.n++;
      if(_rc.n===3)send(u,{siteId:i,sessionId:d,type:"rage_click",pathname:location.pathname});
    }else{_rc={el:e.target,t:now,n:1};}
  },true);

  // Dead click detection: click with no DOM mutation within 100ms
  if(typeof MutationObserver!=="undefined"){
    document.addEventListener("click",function(){
      var hit=false;
      var mo=new MutationObserver(function(){hit=true;mo.disconnect();});
      mo.observe(document.body,{childList:true,subtree:true,attributes:true});
      setTimeout(function(){
        mo.disconnect();
        if(!hit)send(u,{siteId:i,sessionId:d,type:"dead_click",pathname:location.pathname});
      },100);
    },true);
  }

  window.analytics={
    track:function(name,props){
      var body=Object.assign({siteId:i,sessionId:d,name:name,pathname:location.pathname,revenue:props&&props.revenue,currency:props&&props.currency,properties:props},utms(location.search));
      send(a+"/api/track/event",body);
    },
    identify:function(userId,traits){
      send(a+"/api/track/identify",{siteId:i,sessionId:d,externalUserId:userId,traits:traits||{}});
    }
  };

  (window.requestIdleCallback||function(cb){setTimeout(cb,1);})(function(){
    var ps=document.createElement("script");
    ps.src=a+"/tracker-perf.js";
    ps.setAttribute("data-site-id",i);
    ps.setAttribute("data-session-id",d);
    ps.setAttribute("data-api",a);
    document.head.appendChild(ps);
  });
})();
