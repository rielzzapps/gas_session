function Session(options) {
    this.loggedin = false;
    this.cookies = {};
    this.requests = [];
    this.responses = [];
    this.sessionOptions = options;
    this.cached = function() {
            try {
                var data = JSON.parse(CacheService.getScriptCache().get("session"))
                for (var key in data) {
                    this[key] = data[key]
                }
                return this;
            } catch (err) {
                throw "Cannot restore session from cache"
            }
        }
        //parse all cookies and save them into the cookies object
    this.getCookies = function(header) {
            if (this.cookies === undefined) throw "No cookies global!";
            var cookie = header['Set-Cookie'];
            if (cookie instanceof Array) {
                for (var i = 0; i < cookie.length; i++) {
                    cookie[i] = cookie[i].split(";")[0];
                    var s = cookie[i].split("=");
                    var key = s[0];
                    s.shift();
                    this.cookies[key] = s.join("");
                }
            } else {
                cookie.split("=");
                var key = s[0];
                s.shift();
                this.cookies[key] = s.join("");
            }
        }
        //create a string from the cookieobject to add to the headers 
    this.cookiestring = function() {
            var s = "";
            for (var key in this.cookies) {
                s += key + "=" + this.cookies[key] + ";";
            }
            return s;
        }
        //do a fetch with all info and cookies for this session
        //to prevent loosing cookies when forwarding, it does several fetches and adds the cookies
        //the session.lastresponse contains all data of the resulting fetch  
    this.fetch = function(url, options, debug) {
        var baseUrl = this.sessionOptions.baseUrl;
        this.UrlFetchOptions.followRedirects = false;
        this.addUrlFetchOptions(options);
        if (!this.UrlFetchOptions.headers) {
            this.UrlFetchOptions.headers = {}
        };
        if (!this.UrlFetchOptions.headers["Cookie"]) {
            this.UrlFetchOptions.headers["Cookie"] = "";
        }
        this.UrlFetchOptions.headers["Cookie"] += this.cookiestring(this.cookies);
        var debug = true;
        var res = UrlFetchApp.fetch(url, this.UrlFetchOptions);
        var refresh = false
        if (debug) this.requests.push(UrlFetchApp.getRequest(url, this.UrlFetchOptions));
        var rh = res.getAllHeaders();
        var rc = res.getResponseCode();
        var ct = res.getContentText();
        if (debug) this.responses.push({
            rh: rh,
            rc: rc,
            contentText: ct
        });
        this.getCookies(rh);
        while (rc == 301) {
            //we get redirected. We need to do a second fetch and add cookies.
            var url = baseUrl + rh.Location
            var res = UrlFetchApp.fetch(url, this.UrlFetchOptions);
            if (debug) this.requests.push(UrlFetchApp.getRequest(url, this.UrlFetchOptions));
            rh = res.getAllHeaders();
            rc = res.getResponseCode();
            ct = res.getContentText();
            if (debug) this.responses.push({
                rh: rh,
                rc: rc,
                contentText: ct
            });
            if (ct) {
                refresh = ct.match('http-equiv="refresh"')
            }
            this.getCookies(rh);
        }
        this.lastresponse = {
            rh: rh,
            rc: rc,
            contentText: res.getContentText()
        }
        return this;
    }
    this.storeSession = function() {
        CacheService.getScriptCache().put("session", JSON.stringify(this));
    }
    this.getContentText = function() {
            return this.lastresponse.contentText;
        }
        //a helper function to parse a html page and find all form tags. Usefull if there are hidden fields
        //that are expected with a POST of credentials
    this.findFormData = function(text) {
            //parse the page for a form//
            var w = text.match(/\<input[\S\s]*?\>/g);
            var x = [];
            w.forEach(function(inputs) {
                x.push(inputs.replace("disabled", "").replace("checked", "") + "</input>");
            })
            var s = '<?xml version="1.0" encoding="UTF-8" standalone="no" ?><data>' + x.join("") + "</data>";
            var q = XmlService.parse(s).getRootElement().getChildren()
            var data = {};
            q.forEach(function(child) {
                var name, value
                child.getAttributes().forEach(function(att) {
                    if (att.getName() == 'name') name = att.getValue();
                    if (att.getName() == 'value') value = att.getValue();
                })
                data[name] = value;
            })
            this.loginformdata = data;
            var formaction = text.match(/action=\"(.*?)\"/);
            if (!formaction[1] && !this.formactionUrl) throw "No url for submit found, set formactionUrl";
            this.formactionUrl = this.formactionUrl || formaction[1];
        }
        //update options object, handy if you need to change a single key
    this.addUrlFetchOptions = function(options) {
        for (var key in options) {
            this.UrlFetchOptions[key] = options[key];
        }
    }
    this.dologin = function(url, options) {
        if (url) {
            if (!this.UrlFetchOptions) {
                this.UrlFetchOptions = {};
            }
            //start login
            //fetch the page to get content data, form and cookies
            var page = this.fetch(url, {
                "method": "get"
            });
            if (page.lastresponse.rc == 200 || this.ignorestartpage) {
                this.findFormData(page.lastresponse.contentText);
            } else {
                throw "Could not load URL, see session.lastresponse";
            }
            this.loginformdata[this.sessionOptions.usernameFormname] = this.sessionOptions.username;
            this.loginformdata[this.sessionOptions.passwordFormname] = this.sessionOptions.password;
            var options = {};
            options.payload = this.loginformdata;
            options.method = "post";
            return this.fetch(this.sessionOptions.formactionUrl, options);
        } else {
            throw "We need a URL and the UrlFetchApp options";
        }
    }
}
