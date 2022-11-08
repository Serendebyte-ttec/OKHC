
function getQueryVariable(variable) {
  var query = window.location.search.substring(1);
  var vars = query.split("&");
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split("=");
    if (pair[0] == variable) {
      return pair[1];
    }
  }
  console.log('Query Variable ' + variable + ' not found');
}

function addStyle(styles) { 
              
              /* Create style document */ 
              var css = document.createElement('style'); 
              css.type = 'text/css'; 
            
              if (css.styleSheet)  
                  css.styleSheet.cssText = styles; 
              else  
                  css.appendChild(document.createTextNode(styles)); 
                
              /* Append style to the tag name */ 
              document.getElementsByTagName("head")[0].appendChild(css); 
          } 


          var username = getQueryVariable("username");
          

          if(username=="lisa" || username=="brown" )
          
        
{
          localStorage.setItem("username", username);
}

          username = localStorage.getItem("username");

          if(username=="lisa")
{
  addStyle('.nav > li:nth-child(2) { display: none; }');

}

if(username=="brown")
{
  
  addStyle('.nav > li:nth-child(3) { display: none; }');

}




var logout = getQueryVariable("logout");

if(logout=="true")
{
    localStorage.removeItem("username");
    window.location.replace("index.html");
}
    