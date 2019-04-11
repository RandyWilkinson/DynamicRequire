import vm = require('vm');

export class DynamicRequire {

    private global = this;
    private CACHE = {};
    private static HostRequire = require;

    public SandboxContext = vm.createContext();
    
    constructor(private options:DynamicRequireOptions) {
        
    }

    public RunRequire(module, filename) {
        
        try {
            var contents;
            // Load module
            if(this.options.callbackRegex && 
                this.options.callbackRegex.exec(filename) &&
                this.options.callback && 
                typeof(this.options.callback) === 'function') {
                    // callbackRegex matches now call the callback function for dynamic 
                    // module loading from strings
                    filename = filename.replace(this.options.callbackRegex, ""); 
                    contents = this.options.callback(filename);
            } else {
                //throw new Error(`Failed to load '${filename}': Unknown type.`, "ELOADFAIL");
            }
            

            var code = `(function (exports, require, module, __filename) { 'use strict'; ${contents} \n});`;

            // Precompile script
            const script = new vm.Script(code, {
                filename: filename || "vm.js",
                displayErrors: false
            });

            var closure = script.runInContext(this.SandboxContext, {
                filename: filename || "vm.js",
                displayErrors: false
            });
        } catch (ex) {
            throw ex;
        }

        // run script
        closure(module.exports, module.require, module, filename);
        
    }

    public PrepareRequire() {
        const _require = (modulename) => {

            // call back regex pattern triggers callback to resolve to string
            if (this.options.callbackRegex && this.options.callbackRegex.exec(modulename)) {
                // skip the filename validation and extension check
                var filename = modulename;

            } else {
                try {
                    return DynamicRequire.HostRequire(modulename);
                } catch (e) {
                    throw e;
                }
            }

            // return cache whenever possible
            if (this.CACHE[filename]) return this.CACHE[filename].exports;


            const module = this.CACHE[filename] = {
                filename,
                exports: {},
                require: this.PrepareRequire()
            };

            // execute the dynamic required code
            this.RunRequire(module, filename);
            
            return module.exports;
            
        };

        return _require;
    }


}

export class DynamicRequireOptions {
    constructor(public callbackRegex:any, public callback: (x:string)=>string){
    }
}