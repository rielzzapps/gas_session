# gas_session
This is a simple code I use to help me keep sessions and cookies when using UrlFetchApp to fetch data from sites with login authentication. It authenticated by sending a login form data, no basic auth. It will not follow redirects, but do these manually (on a 301).

Feel free to improve.

## usage
Create options object, 
```
{
        usernameFormname:"username",    //this is the name attribute of the form element / the key in the post body
        passwordFormname:"password",    //this is the name attribute of the form element / the key in the post body
        username:"", //your credentials
        password:"",
        baseUrl:"http://www.domain.com", //the bare domain name     
        formactionUrl:"/post-url" //not always needed, session.gs tries to find the action=" " link and appends it to baseUrl
}
```
Create a new Session object

```
var session = new Session(sessionOptions);
```

then do a login on the page where the actual loginform is. 
```
session.dologin("https://www.domain.com/loginformpage");
```

session will grab all form data and puts in in the session.loginformdata object, which is useful if the page needs some extra info in the body.

Use session.fetch() to fetch a new URL with the saved cookies. UrlFetchOptions are saved, but you can update them by adding the usual options object form urlfetchApp. It will only add or overwrite existing keys, not remove keys.

```
var url = "http://www.domain.com/myauthenticatedpage/fetchdata";
  var headers = { "extradata ":session.loginformdata.extradata } //if you need an extra header
  var options = { 
    "headers": headers,
    "method": "get",
    "followRedirects": true  <-- If this works for your page. Sometimes it has to follow the redirect to get the data. Session puts it on false standard.
  }  
  
var result = session.fetch(url, options) //fetch returns the session object

//you can do only .getContentText() because that is what we are used to :)
result.getContentText();
```

Other handy stuff:

session.lastresponse.rh -> last response headers
session.lastresponse.rc  -> last response code
session.lastresponse.contentText -> last response contentText()

session.requests - array of all requests
session.responses - array of all responses
