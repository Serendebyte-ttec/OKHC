
var loggedUser = localStorage.getItem("username");

/* passing parameters dynamically - start */
function preparePegaAParams(gadgetName) {
  var pegaAParamObj = {};
  /* Lets not include credentails*/
  /* pegaAParamObj.UserIdentifier="";
	pegaAParamObj.Password="";
  */



  if (loggedUser == "lisa") {
    pegaAParamObj.AppName = "WebChatbot";
    pegaAParamObj.HelpConfigurationName = "<<ConfigurationNamePlaceHolder>>";
    pegaAParamObj.channelId = "<<ChannelIdPlaceHolder>>";
    pegaAParamObj.ContactId = getCookie("ContactID");
    //	pegaAParamObj.AccountNumber=getCookie("AccountNumber");
    pegaAParamObj.ProviderName = getCookie("ProviderName");
    pegaAParamObj.ProviderNumber = getCookie("ProviderNumber");
    //	pegaAParamObj.PolicyNumber=getCookie("PolicyNumber");
    pegaAParamObj.HCCustomerType = getCookie("HCCustomerType");
    pegaAParamObj.IsCallerAProvider = getCookie("IsCallerAProvider");
    pegaAParamObj.pyWorkPartyUri = getCookie("pyWorkPartyUri");
    pegaAParamObj.EntityTypeQualifier = getCookie("EntityTypeQualifier");

    pegaAParamObj.pzSkinName = "OnlineHelp";
  } else {

    pegaAParamObj.AppName = "WebChatbot";
    pegaAParamObj.HelpConfigurationName = "<<ConfigurationNamePlaceHolder>>";
    pegaAParamObj.channelId = "<<ChannelIdPlaceHolder>>";
    pegaAParamObj.ContactId = getCookie("ContactID");
    //	pegaAParamObj.AccountNumber=getCookie("AccountNumber");
    pegaAParamObj.username = getCookie("username");
    pegaAParamObj.MemberID = getCookie("MemberID");
    pegaAParamObj.PolicyNumber = getCookie("PolicyNumber");
    pegaAParamObj.HCCustomerType = getCookie("HCCustomerType");
    pegaAParamObj.IsCallerAMember = getCookie("IsCallerAMember");

    pegaAParamObj.pzSkinName = "OnlineHelp";


  }


  return pegaAParamObj;


}


function setCookie(cname, cvalue, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
  var expires = "expires=" + d.toGMTString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) === ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}


if (loggedUser == "lisa") {

  /* Set cookies. To be overwritten locally */
  setCookie("ContactID", "PC2015072426", 30);
  setCookie("ProviderNumber", "PC2015072426", 30);
  //setCookie("PolicyNumber","PO2015092894", 30);
  setCookie("HCCustomerType", "Provider", 30);
  setCookie("ProviderName", "Lisa Binder", 30);
  setCookie("IsCallerAProvider", "true", 30);
  setCookie("pyWorkPartyUri", "PC2015072426", 30);
  setCookie("EntityTypeQualifier", "1", 30);

} else {

  /* Set cookies. To be overwritten locally */
  setCookie("ContactID", "MB2015072422", 30);
  setCookie("MemberID", "MB2015072422", 30);
  setCookie("PolicyNumber", "PO2015092894", 30);
  setCookie("HCCustomerType", "Member", 30);
  setCookie("username", "Beth Miller", 30);
  setCookie("IsCallerAMember", "true", 30);
}
