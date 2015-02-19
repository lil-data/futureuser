// The Module object: Our interface to the outside world. We import
// and export values on it, and do the work to get that through
// closure compiler if necessary. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to do an eval in order to handle the closure compiler
// case, where this code here is minified but Module was defined
// elsewhere (e.g. case 4 above). We also need to check if Module
// already exists (e.g. case 3 above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module;
if (!Module) Module = (typeof Module !== 'undefined' ? Module : null) || {};

// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
for (var key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}

// The environment setup code below is customized to use Module.
// *** Environment setup code ***
var ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function';
var ENVIRONMENT_IS_WEB = typeof window === 'object';
var ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (ENVIRONMENT_IS_NODE) {
  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  if (!Module['print']) Module['print'] = function print(x) {
    process['stdout'].write(x + '\n');
  };
  if (!Module['printErr']) Module['printErr'] = function printErr(x) {
    process['stderr'].write(x + '\n');
  };

  var nodeFS = require('fs');
  var nodePath = require('path');

  Module['read'] = function read(filename, binary) {
    filename = nodePath['normalize'](filename);
    var ret = nodeFS['readFileSync'](filename);
    // The path is absolute if the normalized version is the same as the resolved.
    if (!ret && filename != nodePath['resolve'](filename)) {
      filename = path.join(__dirname, '..', 'src', filename);
      ret = nodeFS['readFileSync'](filename);
    }
    if (ret && !binary) ret = ret.toString();
    return ret;
  };

  Module['readBinary'] = function readBinary(filename) { return Module['read'](filename, true) };

  Module['load'] = function load(f) {
    globalEval(read(f));
  };

  if (process['argv'].length > 1) {
    Module['thisProgram'] = process['argv'][1].replace(/\\/g, '/');
  } else {
    Module['thisProgram'] = 'unknown-program';
  }

  Module['arguments'] = process['argv'].slice(2);

  if (typeof module !== 'undefined') {
    module['exports'] = Module;
  }

  process['on']('uncaughtException', function(ex) {
    // suppress ExitStatus exceptions from showing an error
    if (!(ex instanceof ExitStatus)) {
      throw ex;
    }
  });
}
else if (ENVIRONMENT_IS_SHELL) {
  if (!Module['print']) Module['print'] = print;
  if (typeof printErr != 'undefined') Module['printErr'] = printErr; // not present in v8 or older sm

  if (typeof read != 'undefined') {
    Module['read'] = read;
  } else {
    Module['read'] = function read() { throw 'no read() available (jsc?)' };
  }

  Module['readBinary'] = function readBinary(f) {
    if (typeof readbuffer === 'function') {
      return new Uint8Array(readbuffer(f));
    }
    var data = read(f, 'binary');
    assert(typeof data === 'object');
    return data;
  };

  if (typeof scriptArgs != 'undefined') {
    Module['arguments'] = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  this['Module'] = Module;

}
else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function read(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  };

  if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  if (typeof console !== 'undefined') {
    if (!Module['print']) Module['print'] = function print(x) {
      console.log(x);
    };
    if (!Module['printErr']) Module['printErr'] = function printErr(x) {
      console.log(x);
    };
  } else {
    // Probably a worker, and without console.log. We can do very little here...
    var TRY_USE_DUMP = false;
    if (!Module['print']) Module['print'] = (TRY_USE_DUMP && (typeof(dump) !== "undefined") ? (function(x) {
      dump(x);
    }) : (function(x) {
      // self.postMessage(x); // enable this if you want stdout to be sent as messages
    }));
  }

  if (ENVIRONMENT_IS_WEB) {
    window['Module'] = Module;
  } else {
    Module['load'] = importScripts;
  }
}
else {
  // Unreachable because SHELL is dependant on the others
  throw 'Unknown runtime environment. Where are we?';
}

function globalEval(x) {
  eval.call(null, x);
}
if (!Module['load'] && Module['read']) {
  Module['load'] = function load(f) {
    globalEval(Module['read'](f));
  };
}
if (!Module['print']) {
  Module['print'] = function(){};
}
if (!Module['printErr']) {
  Module['printErr'] = Module['print'];
}
if (!Module['arguments']) {
  Module['arguments'] = [];
}
if (!Module['thisProgram']) {
  Module['thisProgram'] = './this.program';
}

// *** Environment setup code ***

// Closure helpers
Module.print = Module['print'];
Module.printErr = Module['printErr'];

// Callbacks
Module['preRun'] = [];
Module['postRun'] = [];

// Merge back in the overrides
for (var key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}



// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in: 
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at: 
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

//========================================
// Runtime code shared with compiler
//========================================

var Runtime = {
  setTempRet0: function (value) {
    tempRet0 = value;
  },
  getTempRet0: function () {
    return tempRet0;
  },
  stackSave: function () {
    return STACKTOP;
  },
  stackRestore: function (stackTop) {
    STACKTOP = stackTop;
  },
  getNativeTypeSize: function (type) {
    switch (type) {
      case 'i1': case 'i8': return 1;
      case 'i16': return 2;
      case 'i32': return 4;
      case 'i64': return 8;
      case 'float': return 4;
      case 'double': return 8;
      default: {
        if (type[type.length-1] === '*') {
          return Runtime.QUANTUM_SIZE; // A pointer
        } else if (type[0] === 'i') {
          var bits = parseInt(type.substr(1));
          assert(bits % 8 === 0);
          return bits/8;
        } else {
          return 0;
        }
      }
    }
  },
  getNativeFieldSize: function (type) {
    return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  },
  STACK_ALIGN: 16,
  getAlignSize: function (type, size, vararg) {
    // we align i64s and doubles on 64-bit boundaries, unlike x86
    if (!vararg && (type == 'i64' || type == 'double')) return 8;
    if (!type) return Math.min(size, 8); // align structures internally to 64 bits
    return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
  },
  dynCall: function (sig, ptr, args) {
    if (args && args.length) {
      assert(args.length == sig.length-1);
      if (!args.splice) args = Array.prototype.slice.call(args);
      args.splice(0, 0, ptr);
      assert(('dynCall_' + sig) in Module, 'bad function pointer type - no table for sig \'' + sig + '\'');
      return Module['dynCall_' + sig].apply(null, args);
    } else {
      assert(sig.length == 1);
      assert(('dynCall_' + sig) in Module, 'bad function pointer type - no table for sig \'' + sig + '\'');
      return Module['dynCall_' + sig].call(null, ptr);
    }
  },
  functionPointers: [null,null],
  addFunction: function (func) {
    for (var i = 0; i < Runtime.functionPointers.length; i++) {
      if (!Runtime.functionPointers[i]) {
        Runtime.functionPointers[i] = func;
        return 2*(1 + i);
      }
    }
    throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';
  },
  removeFunction: function (index) {
    Runtime.functionPointers[(index-2)/2] = null;
  },
  getAsmConst: function (code, numArgs) {
    // code is a constant string on the heap, so we can cache these
    if (!Runtime.asmConstCache) Runtime.asmConstCache = {};
    var func = Runtime.asmConstCache[code];
    if (func) return func;
    var args = [];
    for (var i = 0; i < numArgs; i++) {
      args.push(String.fromCharCode(36) + i); // $0, $1 etc
    }
    var source = Pointer_stringify(code);
    if (source[0] === '"') {
      // tolerate EM_ASM("..code..") even though EM_ASM(..code..) is correct
      if (source.indexOf('"', 1) === source.length-1) {
        source = source.substr(1, source.length-2);
      } else {
        // something invalid happened, e.g. EM_ASM("..code($0)..", input)
        abort('invalid EM_ASM input |' + source + '|. Please use EM_ASM(..code..) (no quotes) or EM_ASM({ ..code($0).. }, input) (to input values)');
      }
    }
    try {
      // Module is the only 'upvar', which we provide directly. We also provide FS for legacy support.
      var evalled = eval('(function(Module, FS) { return function(' + args.join(',') + '){ ' + source + ' } })')(Module, typeof FS !== 'undefined' ? FS : null);
    } catch(e) {
      Module.printErr('error in executing inline EM_ASM code: ' + e + ' on: \n\n' + source + '\n\nwith args |' + args + '| (make sure to use the right one out of EM_ASM, EM_ASM_ARGS, etc.)');
      throw e;
    }
    return Runtime.asmConstCache[code] = evalled;
  },
  warnOnce: function (text) {
    if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
    if (!Runtime.warnOnce.shown[text]) {
      Runtime.warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  },
  funcWrappers: {},
  getFuncWrapper: function (func, sig) {
    assert(sig);
    if (!Runtime.funcWrappers[sig]) {
      Runtime.funcWrappers[sig] = {};
    }
    var sigCache = Runtime.funcWrappers[sig];
    if (!sigCache[func]) {
      sigCache[func] = function dynCall_wrapper() {
        return Runtime.dynCall(sig, func, arguments);
      };
    }
    return sigCache[func];
  },
  UTF8Processor: function () {
    var buffer = [];
    var needed = 0;
    this.processCChar = function (code) {
      code = code & 0xFF;

      if (buffer.length == 0) {
        if ((code & 0x80) == 0x00) {        // 0xxxxxxx
          return String.fromCharCode(code);
        }
        buffer.push(code);
        if ((code & 0xE0) == 0xC0) {        // 110xxxxx
          needed = 1;
        } else if ((code & 0xF0) == 0xE0) { // 1110xxxx
          needed = 2;
        } else {                            // 11110xxx
          needed = 3;
        }
        return '';
      }

      if (needed) {
        buffer.push(code);
        needed--;
        if (needed > 0) return '';
      }

      var c1 = buffer[0];
      var c2 = buffer[1];
      var c3 = buffer[2];
      var c4 = buffer[3];
      var ret;
      if (buffer.length == 2) {
        ret = String.fromCharCode(((c1 & 0x1F) << 6)  | (c2 & 0x3F));
      } else if (buffer.length == 3) {
        ret = String.fromCharCode(((c1 & 0x0F) << 12) | ((c2 & 0x3F) << 6)  | (c3 & 0x3F));
      } else {
        // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
        var codePoint = ((c1 & 0x07) << 18) | ((c2 & 0x3F) << 12) |
                        ((c3 & 0x3F) << 6)  | (c4 & 0x3F);
        ret = String.fromCharCode(
          (((codePoint - 0x10000) / 0x400)|0) + 0xD800,
          (codePoint - 0x10000) % 0x400 + 0xDC00);
      }
      buffer.length = 0;
      return ret;
    }
    this.processJSString = function processJSString(string) {
      /* TODO: use TextEncoder when present,
        var encoder = new TextEncoder();
        encoder['encoding'] = "utf-8";
        var utf8Array = encoder['encode'](aMsg.data);
      */
      string = unescape(encodeURIComponent(string));
      var ret = [];
      for (var i = 0; i < string.length; i++) {
        ret.push(string.charCodeAt(i));
      }
      return ret;
    }
  },
  getCompilerSetting: function (name) {
    throw 'You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work';
  },
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = (((STACKTOP)+15)&-16);(assert((((STACKTOP|0) < (STACK_MAX|0))|0))|0); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + (assert(!staticSealed),size))|0;STATICTOP = (((STATICTOP)+15)&-16); return ret; },
  dynamicAlloc: function (size) { var ret = DYNAMICTOP;DYNAMICTOP = (DYNAMICTOP + (assert(DYNAMICTOP > 0),size))|0;DYNAMICTOP = (((DYNAMICTOP)+15)&-16); if (DYNAMICTOP >= TOTAL_MEMORY) enlargeMemory();; return ret; },
  alignMemory: function (size,quantum) { var ret = size = Math.ceil((size)/(quantum ? quantum : 16))*(quantum ? quantum : 16); return ret; },
  makeBigInt: function (low,high,unsigned) { var ret = (unsigned ? ((+((low>>>0)))+((+((high>>>0)))*4294967296.0)) : ((+((low>>>0)))+((+((high|0)))*4294967296.0))); return ret; },
  GLOBAL_BASE: 8,
  QUANTUM_SIZE: 4,
  __dummy__: 0
}


Module['Runtime'] = Runtime;

function jsCall() {
  var args = Array.prototype.slice.call(arguments);
  return Runtime.functionPointers[args[0]].apply(null, args.slice(1));
}








//========================================
// Runtime essentials
//========================================

var __THREW__ = 0; // Used in checking for thrown exceptions.

var ABORT = false; // whether we are quitting the application. no code should run after this. set in exit() and abort()
var EXITSTATUS = 0;

var undef = 0;
// tempInt is used for 32-bit signed values or smaller. tempBigInt is used
// for 32-bit unsigned values or more than 32 bits. TODO: audit all uses of tempInt
var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD, tempDouble, tempFloat;
var tempI64, tempI64b;
var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;

function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}

var globalScope = this;

// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  var func = Module['_' + ident]; // closure exported function
  if (!func) {
    try {
      func = eval('_' + ident); // explicit lookup
    } catch(e) {}
  }
  assert(func, 'Cannot call unknown function ' + ident + ' (perhaps LLVM optimizations or closure removed it?)');
  return func;
}

var cwrap, ccall;
(function(){
  var JSfuncs = {
    // Helpers for cwrap -- it can't refer to Runtime directly because it might
    // be renamed by closure, instead it calls JSfuncs['stackSave'].body to find
    // out what the minified function name is.
    'stackSave': function() {
      Runtime.stackSave()
    },
    'stackRestore': function() {
      Runtime.stackRestore()
    },
    // type conversion from js to c
    'arrayToC' : function(arr) {
      var ret = Runtime.stackAlloc(arr.length);
      writeArrayToMemory(arr, ret);
      return ret;
    },
    'stringToC' : function(str) {
      var ret = 0;
      if (str !== null && str !== undefined && str !== 0) { // null string
        // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
        ret = Runtime.stackAlloc((str.length << 2) + 1);
        writeStringToMemory(str, ret);
      }
      return ret;
    }
  };
  // For fast lookup of conversion functions
  var toC = {'string' : JSfuncs['stringToC'], 'array' : JSfuncs['arrayToC']};

  // C calling interface. 
  ccall = function ccallFunc(ident, returnType, argTypes, args) {
    var func = getCFunc(ident);
    var cArgs = [];
    var stack = 0;
    assert(returnType !== 'array', 'Return type should not be "array".');
    if (args) {
      for (var i = 0; i < args.length; i++) {
        var converter = toC[argTypes[i]];
        if (converter) {
          if (stack === 0) stack = Runtime.stackSave();
          cArgs[i] = converter(args[i]);
        } else {
          cArgs[i] = args[i];
        }
      }
    }
    var ret = func.apply(null, cArgs);
    if (returnType === 'string') ret = Pointer_stringify(ret);
    if (stack !== 0) Runtime.stackRestore(stack);
    return ret;
  }

  var sourceRegex = /^function\s*\(([^)]*)\)\s*{\s*([^*]*?)[\s;]*(?:return\s*(.*?)[;\s]*)?}$/;
  function parseJSFunc(jsfunc) {
    // Match the body and the return value of a javascript function source
    var parsed = jsfunc.toString().match(sourceRegex).slice(1);
    return {arguments : parsed[0], body : parsed[1], returnValue: parsed[2]}
  }
  var JSsource = {};
  for (var fun in JSfuncs) {
    if (JSfuncs.hasOwnProperty(fun)) {
      // Elements of toCsource are arrays of three items:
      // the code, and the return value
      JSsource[fun] = parseJSFunc(JSfuncs[fun]);
    }
  }

  
  cwrap = function cwrap(ident, returnType, argTypes) {
    argTypes = argTypes || [];
    var cfunc = getCFunc(ident);
    // When the function takes numbers and returns a number, we can just return
    // the original function
    var numericArgs = argTypes.every(function(type){ return type === 'number'});
    var numericRet = (returnType !== 'string');
    if ( numericRet && numericArgs) {
      return cfunc;
    }
    // Creation of the arguments list (["$1","$2",...,"$nargs"])
    var argNames = argTypes.map(function(x,i){return '$'+i});
    var funcstr = "(function(" + argNames.join(',') + ") {";
    var nargs = argTypes.length;
    if (!numericArgs) {
      // Generate the code needed to convert the arguments from javascript
      // values to pointers
      funcstr += 'var stack = ' + JSsource['stackSave'].body + ';';
      for (var i = 0; i < nargs; i++) {
        var arg = argNames[i], type = argTypes[i];
        if (type === 'number') continue;
        var convertCode = JSsource[type + 'ToC']; // [code, return]
        funcstr += 'var ' + convertCode.arguments + ' = ' + arg + ';';
        funcstr += convertCode.body + ';';
        funcstr += arg + '=' + convertCode.returnValue + ';';
      }
    }

    // When the code is compressed, the name of cfunc is not literally 'cfunc' anymore
    var cfuncname = parseJSFunc(function(){return cfunc}).returnValue;
    // Call the function
    funcstr += 'var ret = ' + cfuncname + '(' + argNames.join(',') + ');';
    if (!numericRet) { // Return type can only by 'string' or 'number'
      // Convert the result to a string
      var strgfy = parseJSFunc(function(){return Pointer_stringify}).returnValue;
      funcstr += 'ret = ' + strgfy + '(ret);';
    }
    if (!numericArgs) {
      // If we had a stack, restore it
      funcstr += JSsource['stackRestore'].body.replace('()', '(stack)') + ';';
    }
    funcstr += 'return ret})';
    return eval(funcstr);
  };
})();
Module["cwrap"] = cwrap;
Module["ccall"] = ccall;


function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[((ptr)>>0)]=value; break;
      case 'i8': HEAP8[((ptr)>>0)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math_min((+(Math_floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}
Module['setValue'] = setValue;


function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[((ptr)>>0)];
      case 'i8': return HEAP8[((ptr)>>0)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for setValue: ' + type);
    }
  return null;
}
Module['getValue'] = getValue;

var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_DYNAMIC = 3; // Cannot be freed except through sbrk
var ALLOC_NONE = 4; // Do not allocate
Module['ALLOC_NORMAL'] = ALLOC_NORMAL;
Module['ALLOC_STACK'] = ALLOC_STACK;
Module['ALLOC_STATIC'] = ALLOC_STATIC;
Module['ALLOC_DYNAMIC'] = ALLOC_DYNAMIC;
Module['ALLOC_NONE'] = ALLOC_NONE;

// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }

  var singleType = typeof types === 'string' ? types : null;

  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  }

  if (zeroinit) {
    var ptr = ret, stop;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)>>0)]=0;
    }
    return ret;
  }

  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(slab, ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }

  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];

    if (typeof curr === 'function') {
      curr = Runtime.getFunctionIndex(curr);
    }

    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }
    assert(type, 'Must know what type to store in allocate!');

    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later

    setValue(ret+i, curr, type);

    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = Runtime.getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }

  return ret;
}
Module['allocate'] = allocate;

function Pointer_stringify(ptr, /* optional */ length) {
  if (length === 0 || !ptr) return '';
  // TODO: use TextDecoder
  // Find the length, and check for UTF while doing so
  var hasUtf = false;
  var t;
  var i = 0;
  while (1) {
    assert(ptr + i < TOTAL_MEMORY);
    t = HEAPU8[(((ptr)+(i))>>0)];
    if (t >= 128) hasUtf = true;
    else if (t == 0 && !length) break;
    i++;
    if (length && i == length) break;
  }
  if (!length) length = i;

  var ret = '';

  if (!hasUtf) {
    var MAX_CHUNK = 1024; // split up into chunks, because .apply on a huge string can overflow the stack
    var curr;
    while (length > 0) {
      curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
      ret = ret ? ret + curr : curr;
      ptr += MAX_CHUNK;
      length -= MAX_CHUNK;
    }
    return ret;
  }

  var utf8 = new Runtime.UTF8Processor();
  for (i = 0; i < length; i++) {
    assert(ptr + i < TOTAL_MEMORY);
    t = HEAPU8[(((ptr)+(i))>>0)];
    ret += utf8.processCChar(t);
  }
  return ret;
}
Module['Pointer_stringify'] = Pointer_stringify;

function UTF16ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
    if (codeUnit == 0)
      return str;
    ++i;
    // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
    str += String.fromCharCode(codeUnit);
  }
}
Module['UTF16ToString'] = UTF16ToString;


function stringToUTF16(str, outPtr) {
  for(var i = 0; i < str.length; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[(((outPtr)+(i*2))>>1)]=codeUnit;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[(((outPtr)+(str.length*2))>>1)]=0;
}
Module['stringToUTF16'] = stringToUTF16;


function UTF32ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}
Module['UTF32ToString'] = UTF32ToString;


function stringToUTF32(str, outPtr) {
  var iChar = 0;
  for(var iCodeUnit = 0; iCodeUnit < str.length; ++iCodeUnit) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    var codeUnit = str.charCodeAt(iCodeUnit); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++iCodeUnit);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[(((outPtr)+(iChar*4))>>2)]=codeUnit;
    ++iChar;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[(((outPtr)+(iChar*4))>>2)]=0;
}
Module['stringToUTF32'] = stringToUTF32;

function demangle(func) {
  var hasLibcxxabi = !!Module['___cxa_demangle'];
  if (hasLibcxxabi) {
    try {
      var buf = _malloc(func.length);
      writeStringToMemory(func.substr(1), buf);
      var status = _malloc(4);
      var ret = Module['___cxa_demangle'](buf, 0, 0, status);
      if (getValue(status, 'i32') === 0 && ret) {
        return Pointer_stringify(ret);
      }
      // otherwise, libcxxabi failed, we can try ours which may return a partial result
    } catch(e) {
      // failure when using libcxxabi, we can try ours which may return a partial result
    } finally {
      if (buf) _free(buf);
      if (status) _free(status);
      if (ret) _free(ret);
    }
  }
  var i = 3;
  // params, etc.
  var basicTypes = {
    'v': 'void',
    'b': 'bool',
    'c': 'char',
    's': 'short',
    'i': 'int',
    'l': 'long',
    'f': 'float',
    'd': 'double',
    'w': 'wchar_t',
    'a': 'signed char',
    'h': 'unsigned char',
    't': 'unsigned short',
    'j': 'unsigned int',
    'm': 'unsigned long',
    'x': 'long long',
    'y': 'unsigned long long',
    'z': '...'
  };
  var subs = [];
  var first = true;
  function dump(x) {
    //return;
    if (x) Module.print(x);
    Module.print(func);
    var pre = '';
    for (var a = 0; a < i; a++) pre += ' ';
    Module.print (pre + '^');
  }
  function parseNested() {
    i++;
    if (func[i] === 'K') i++; // ignore const
    var parts = [];
    while (func[i] !== 'E') {
      if (func[i] === 'S') { // substitution
        i++;
        var next = func.indexOf('_', i);
        var num = func.substring(i, next) || 0;
        parts.push(subs[num] || '?');
        i = next+1;
        continue;
      }
      if (func[i] === 'C') { // constructor
        parts.push(parts[parts.length-1]);
        i += 2;
        continue;
      }
      var size = parseInt(func.substr(i));
      var pre = size.toString().length;
      if (!size || !pre) { i--; break; } // counter i++ below us
      var curr = func.substr(i + pre, size);
      parts.push(curr);
      subs.push(curr);
      i += pre + size;
    }
    i++; // skip E
    return parts;
  }
  function parse(rawList, limit, allowVoid) { // main parser
    limit = limit || Infinity;
    var ret = '', list = [];
    function flushList() {
      return '(' + list.join(', ') + ')';
    }
    var name;
    if (func[i] === 'N') {
      // namespaced N-E
      name = parseNested().join('::');
      limit--;
      if (limit === 0) return rawList ? [name] : name;
    } else {
      // not namespaced
      if (func[i] === 'K' || (first && func[i] === 'L')) i++; // ignore const and first 'L'
      var size = parseInt(func.substr(i));
      if (size) {
        var pre = size.toString().length;
        name = func.substr(i + pre, size);
        i += pre + size;
      }
    }
    first = false;
    if (func[i] === 'I') {
      i++;
      var iList = parse(true);
      var iRet = parse(true, 1, true);
      ret += iRet[0] + ' ' + name + '<' + iList.join(', ') + '>';
    } else {
      ret = name;
    }
    paramLoop: while (i < func.length && limit-- > 0) {
      //dump('paramLoop');
      var c = func[i++];
      if (c in basicTypes) {
        list.push(basicTypes[c]);
      } else {
        switch (c) {
          case 'P': list.push(parse(true, 1, true)[0] + '*'); break; // pointer
          case 'R': list.push(parse(true, 1, true)[0] + '&'); break; // reference
          case 'L': { // literal
            i++; // skip basic type
            var end = func.indexOf('E', i);
            var size = end - i;
            list.push(func.substr(i, size));
            i += size + 2; // size + 'EE'
            break;
          }
          case 'A': { // array
            var size = parseInt(func.substr(i));
            i += size.toString().length;
            if (func[i] !== '_') throw '?';
            i++; // skip _
            list.push(parse(true, 1, true)[0] + ' [' + size + ']');
            break;
          }
          case 'E': break paramLoop;
          default: ret += '?' + c; break paramLoop;
        }
      }
    }
    if (!allowVoid && list.length === 1 && list[0] === 'void') list = []; // avoid (void)
    if (rawList) {
      if (ret) {
        list.push(ret + '?');
      }
      return list;
    } else {
      return ret + flushList();
    }
  }
  var parsed = func;
  try {
    // Special-case the entry point, since its name differs from other name mangling.
    if (func == 'Object._main' || func == '_main') {
      return 'main()';
    }
    if (typeof func === 'number') func = Pointer_stringify(func);
    if (func[0] !== '_') return func;
    if (func[1] !== '_') return func; // C function
    if (func[2] !== 'Z') return func;
    switch (func[3]) {
      case 'n': return 'operator new()';
      case 'd': return 'operator delete()';
    }
    parsed = parse();
  } catch(e) {
    parsed += '?';
  }
  if (parsed.indexOf('?') >= 0 && !hasLibcxxabi) {
    Runtime.warnOnce('warning: a problem occurred in builtin C++ name demangling; build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling');
  }
  return parsed;
}

function demangleAll(text) {
  return text.replace(/__Z[\w\d_]+/g, function(x) { var y = demangle(x); return x === y ? x : (x + ' [' + y + ']') });
}

function jsStackTrace() {
  var err = new Error();
  if (!err.stack) {
    // IE10+ special cases: It does have callstack info, but it is only populated if an Error object is thrown,
    // so try that as a special-case.
    try {
      throw new Error(0);
    } catch(e) {
      err = e;
    }
    if (!err.stack) {
      return '(no stack trace available)';
    }
  }
  return err.stack.toString();
}

function stackTrace() {
  return demangleAll(jsStackTrace());
}
Module['stackTrace'] = stackTrace;

// Memory management

var PAGE_SIZE = 4096;
function alignMemoryPage(x) {
  return (x+4095)&-4096;
}

var HEAP;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

var STATIC_BASE = 0, STATICTOP = 0, staticSealed = false; // static area
var STACK_BASE = 0, STACKTOP = 0, STACK_MAX = 0; // stack area
var DYNAMIC_BASE = 0, DYNAMICTOP = 0; // dynamic area handled by sbrk

function enlargeMemory() {
  abort('Cannot enlarge memory arrays. Either (1) compile with -s TOTAL_MEMORY=X with X higher than the current value ' + TOTAL_MEMORY + ', (2) compile with ALLOW_MEMORY_GROWTH which adjusts the size at runtime but prevents some optimizations, or (3) set Module.TOTAL_MEMORY before the program runs.');
}


var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 16777216;
var FAST_MEMORY = Module['FAST_MEMORY'] || 2097152;

var totalMemory = 64*1024;
while (totalMemory < TOTAL_MEMORY || totalMemory < 2*TOTAL_STACK) {
  if (totalMemory < 16*1024*1024) {
    totalMemory *= 2;
  } else {
    totalMemory += 16*1024*1024
  }
}
if (totalMemory !== TOTAL_MEMORY) {
  Module.printErr('increasing TOTAL_MEMORY to ' + totalMemory + ' to be compliant with the asm.js spec');
  TOTAL_MEMORY = totalMemory;
}

// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(typeof Int32Array !== 'undefined' && typeof Float64Array !== 'undefined' && !!(new Int32Array(1)['subarray']) && !!(new Int32Array(1)['set']),
       'JS engine does not provide full typed array support');

var buffer = new ArrayBuffer(TOTAL_MEMORY);
HEAP8 = new Int8Array(buffer);
HEAP16 = new Int16Array(buffer);
HEAP32 = new Int32Array(buffer);
HEAPU8 = new Uint8Array(buffer);
HEAPU16 = new Uint16Array(buffer);
HEAPU32 = new Uint32Array(buffer);
HEAPF32 = new Float32Array(buffer);
HEAPF64 = new Float64Array(buffer);

// Endianness check (note: assumes compiler arch was little-endian)
HEAP32[0] = 255;
assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, 'Typed arrays 2 must be run on a little-endian system');

Module['HEAP'] = HEAP;
Module['buffer'] = buffer;
Module['HEAP8'] = HEAP8;
Module['HEAP16'] = HEAP16;
Module['HEAP32'] = HEAP32;
Module['HEAPU8'] = HEAPU8;
Module['HEAPU16'] = HEAPU16;
Module['HEAPU32'] = HEAPU32;
Module['HEAPF32'] = HEAPF32;
Module['HEAPF64'] = HEAPF64;

function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Runtime.dynCall('v', func);
      } else {
        Runtime.dynCall('vi', func, [callback.arg]);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}

var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the runtime has exited

var runtimeInitialized = false;
var runtimeExited = false;

function preRun() {
  // compatibility - merge in anything from Module['preRun'] at this time
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function ensureInitRuntime() {
  if (runtimeInitialized) return;
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
  runtimeExited = true;
}

function postRun() {
  // compatibility - merge in anything from Module['postRun'] at this time
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}
Module['addOnPreRun'] = Module.addOnPreRun = addOnPreRun;

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}
Module['addOnInit'] = Module.addOnInit = addOnInit;

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}
Module['addOnPreMain'] = Module.addOnPreMain = addOnPreMain;

function addOnExit(cb) {
  __ATEXIT__.unshift(cb);
}
Module['addOnExit'] = Module.addOnExit = addOnExit;

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}
Module['addOnPostRun'] = Module.addOnPostRun = addOnPostRun;

// Tools


function intArrayFromString(stringy, dontAddNull, length /* optional */) {
  var ret = (new Runtime.UTF8Processor()).processJSString(stringy);
  if (length) {
    ret.length = length;
  }
  if (!dontAddNull) {
    ret.push(0);
  }
  return ret;
}
Module['intArrayFromString'] = intArrayFromString;

function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
        assert(false, 'Character code ' + chr + ' (' + String.fromCharCode(chr) + ')  at offset ' + i + ' not in 0x00-0xFF.');
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}
Module['intArrayToString'] = intArrayToString;

function writeStringToMemory(string, buffer, dontAddNull) {
  var array = intArrayFromString(string, dontAddNull);
  var i = 0;
  while (i < array.length) {
    var chr = array[i];
    HEAP8[(((buffer)+(i))>>0)]=chr;
    i = i + 1;
  }
}
Module['writeStringToMemory'] = writeStringToMemory;

function writeArrayToMemory(array, buffer) {
  for (var i = 0; i < array.length; i++) {
    HEAP8[(((buffer)+(i))>>0)]=array[i];
  }
}
Module['writeArrayToMemory'] = writeArrayToMemory;

function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; i++) {
    assert(str.charCodeAt(i) === str.charCodeAt(i)&0xff);
    HEAP8[(((buffer)+(i))>>0)]=str.charCodeAt(i);
  }
  if (!dontAddNull) HEAP8[(((buffer)+(str.length))>>0)]=0;
}
Module['writeAsciiToMemory'] = writeAsciiToMemory;

function unSign(value, bits, ignore) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}

// check for imul support, and also for correctness ( https://bugs.webkit.org/show_bug.cgi?id=126345 )
if (!Math['imul'] || Math['imul'](0xffffffff, 5) !== -5) Math['imul'] = function imul(a, b) {
  var ah  = a >>> 16;
  var al = a & 0xffff;
  var bh  = b >>> 16;
  var bl = b & 0xffff;
  return (al*bl + ((ah*bl + al*bh) << 16))|0;
};
Math.imul = Math['imul'];


var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_min = Math.min;

// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled
var runDependencyTracking = {};

function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(!runDependencyTracking[id]);
    runDependencyTracking[id] = 1;
    if (runDependencyWatcher === null && typeof setInterval !== 'undefined') {
      // Check for missing dependencies every few seconds
      runDependencyWatcher = setInterval(function() {
        if (ABORT) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
          return;
        }
        var shown = false;
        for (var dep in runDependencyTracking) {
          if (!shown) {
            shown = true;
            Module.printErr('still waiting on run dependencies:');
          }
          Module.printErr('dependency: ' + dep);
        }
        if (shown) {
          Module.printErr('(end of list)');
        }
      }, 10000);
    }
  } else {
    Module.printErr('warning: run dependency added without ID');
  }
}
Module['addRunDependency'] = addRunDependency;
function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(runDependencyTracking[id]);
    delete runDependencyTracking[id];
  } else {
    Module.printErr('warning: run dependency removed without ID');
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}
Module['removeRunDependency'] = removeRunDependency;

Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data


var memoryInitializer = null;

// === Body ===





STATIC_BASE = 8;

STATICTOP = STATIC_BASE + 1328;
  /* global initializers */ __ATINIT__.push();
  

/* memory initializer */ allocate([110,117,109,69,108,101,109,101,110,116,115,32,62,32,48,0,46,47,98,117,105,108,100,47,99,47,72,118,77,101,115,115,97,103,101,46,104,0,0,0,109,115,103,95,103,101,116,66,121,116,101,83,105,122,101,0,98,97,110,103,0,0,0,0,102,108,111,97,116,0,0,0,110,117,109,69,108,101,109,101,110,116,115,32,62,32,48,0,46,47,98,117,105,108,100,47,99,47,72,118,77,101,115,115,97,103,101,46,104,0,0,0,109,115,103,95,103,101,116,66,121,116,101,83,105,122,101,0,102,108,117,115,104,0,0,0,99,108,101,97,114,0,0,0,115,97,109,112,108,101,114,97,116,101,0,0,0,0,0,0,110,117,109,73,110,112,117,116,67,104,97,110,110,101,108,115,0,0,0,0,0,0,0,0,110,117,109,79,117,116,112,117,116,67,104,97,110,110,101,108,115,0,0,0,0,0,0,0,99,117,114,114,101,110,116,84,105,109,101,0,0,0,0,0,116,97,98,108,101,0,0,0,108,101,110,103,116,104,0,0,115,105,122,101,0,0,0,0,104,101,97,100,0,0,0,0,110,117,109,69,108,101,109,101,110,116,115,32,62,32,48,0,46,47,98,117,105,108,100,47,99,47,72,118,77,101,115,115,97,103,101,46,104,0,0,0,109,115,103,95,103,101,116,66,121,116,101,83,105,122,101,0,110,117,109,69,108,101,109,101,110,116,115,32,62,32,48,0,46,47,98,117,105,108,100,47,99,47,72,118,77,101,115,115,97,103,101,46,104,0,0,0,109,115,103,95,103,101,116,66,121,116,101,83,105,122,101,0,110,117,109,69,108,101,109,101,110,116,115,32,62,32,48,0,46,47,98,117,105,108,100,47,99,47,72,118,77,101,115,115,97,103,101,46,104,0,0,0,109,115,103,95,103,101,116,66,121,116,101,83,105,122,101,0,100,101,108,45,71,86,81,109,113,45,104,101,108,108,111,0,99,108,101,97,114,0,0,0,116,97,98,108,101,0,0,0,115,105,122,101,0,0,0,0,115,97,109,112,108,101,114,97,116,101,0,0,0,0,0,0,114,101,115,105,122,101,0,0,110,117,109,69,108,101,109,101,110,116,115,32,62,32,48,0,46,47,98,117,105,108,100,47,99,47,72,118,77,101,115,115,97,103,101,46,104,0,0,0,109,115,103,95,103,101,116,66,121,116,101,83,105,122,101,0,109,115,103,95,103,101,116,78,117,109,66,121,116,101,115,40,109,41,32,60,61,32,108,101,110,0,0,0,0,0,0,0,46,47,98,117,105,108,100,47,99,47,72,118,77,101,115,115,97,103,101,46,99,0,0,0,109,115,103,95,99,111,112,121,84,111,66,117,102,102,101,114,0,0,0,0,0,0,0,0,108,101,110,95,114,32,43,32,115,121,109,76,101,110,32,60,61,32,108,101,110,0,0,0,110,117,109,69,108,101,109,101,110,116,115,32,62,32,48,0,46,47,98,117,105,108,100,47,99,47,72,118,77,101,115,115,97,103,101,46,104,0,0,0,109,115,103,95,103,101,116,66,121,116,101,83,105,122,101,0,114,101,115,105,122,101,0,0,105,32,60,32,77,80,95,78,85,77,95,77,69,83,83,65,71,69,95,76,73,83,84,83,0,0,0,0,0,0,0,0,46,47,98,117,105,108,100,47,99,47,77,101,115,115,97,103,101,80,111,111,108,46,99,0,109,112,95,97,100,100,77,101,115,115,97,103,101,0,0,0,110,101,119,73,110,100,101,120,32,60,61,32,109,112,45,62,98,117,102,102,101,114,83,105,122,101,0,0,0,0,0,0,115,116,111,112,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE);




var tempDoublePtr = Runtime.alignMemory(allocate(12, "i8", ALLOC_STATIC), 8);

assert(tempDoublePtr % 8 == 0);

function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

}

function copyTempDouble(ptr) {

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];

  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];

  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];

  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];

}


   
  Module["_memset"] = _memset;

  var _fabsf=Math_abs;

  
  
  var ___errno_state=0;function ___setErrNo(value) {
      // For convenient setting and returning of errno.
      HEAP32[((___errno_state)>>2)]=value;
      return value;
    }
  
  var ERRNO_CODES={EPERM:1,ENOENT:2,ESRCH:3,EINTR:4,EIO:5,ENXIO:6,E2BIG:7,ENOEXEC:8,EBADF:9,ECHILD:10,EAGAIN:11,EWOULDBLOCK:11,ENOMEM:12,EACCES:13,EFAULT:14,ENOTBLK:15,EBUSY:16,EEXIST:17,EXDEV:18,ENODEV:19,ENOTDIR:20,EISDIR:21,EINVAL:22,ENFILE:23,EMFILE:24,ENOTTY:25,ETXTBSY:26,EFBIG:27,ENOSPC:28,ESPIPE:29,EROFS:30,EMLINK:31,EPIPE:32,EDOM:33,ERANGE:34,ENOMSG:42,EIDRM:43,ECHRNG:44,EL2NSYNC:45,EL3HLT:46,EL3RST:47,ELNRNG:48,EUNATCH:49,ENOCSI:50,EL2HLT:51,EDEADLK:35,ENOLCK:37,EBADE:52,EBADR:53,EXFULL:54,ENOANO:55,EBADRQC:56,EBADSLT:57,EDEADLOCK:35,EBFONT:59,ENOSTR:60,ENODATA:61,ETIME:62,ENOSR:63,ENONET:64,ENOPKG:65,EREMOTE:66,ENOLINK:67,EADV:68,ESRMNT:69,ECOMM:70,EPROTO:71,EMULTIHOP:72,EDOTDOT:73,EBADMSG:74,ENOTUNIQ:76,EBADFD:77,EREMCHG:78,ELIBACC:79,ELIBBAD:80,ELIBSCN:81,ELIBMAX:82,ELIBEXEC:83,ENOSYS:38,ENOTEMPTY:39,ENAMETOOLONG:36,ELOOP:40,EOPNOTSUPP:95,EPFNOSUPPORT:96,ECONNRESET:104,ENOBUFS:105,EAFNOSUPPORT:97,EPROTOTYPE:91,ENOTSOCK:88,ENOPROTOOPT:92,ESHUTDOWN:108,ECONNREFUSED:111,EADDRINUSE:98,ECONNABORTED:103,ENETUNREACH:101,ENETDOWN:100,ETIMEDOUT:110,EHOSTDOWN:112,EHOSTUNREACH:113,EINPROGRESS:115,EALREADY:114,EDESTADDRREQ:89,EMSGSIZE:90,EPROTONOSUPPORT:93,ESOCKTNOSUPPORT:94,EADDRNOTAVAIL:99,ENETRESET:102,EISCONN:106,ENOTCONN:107,ETOOMANYREFS:109,EUSERS:87,EDQUOT:122,ESTALE:116,ENOTSUP:95,ENOMEDIUM:123,EILSEQ:84,EOVERFLOW:75,ECANCELED:125,ENOTRECOVERABLE:131,EOWNERDEAD:130,ESTRPIPE:86};function _sysconf(name) {
      // long sysconf(int name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/sysconf.html
      switch(name) {
        case 30: return PAGE_SIZE;
        case 132:
        case 133:
        case 12:
        case 137:
        case 138:
        case 15:
        case 235:
        case 16:
        case 17:
        case 18:
        case 19:
        case 20:
        case 149:
        case 13:
        case 10:
        case 236:
        case 153:
        case 9:
        case 21:
        case 22:
        case 159:
        case 154:
        case 14:
        case 77:
        case 78:
        case 139:
        case 80:
        case 81:
        case 79:
        case 82:
        case 68:
        case 67:
        case 164:
        case 11:
        case 29:
        case 47:
        case 48:
        case 95:
        case 52:
        case 51:
        case 46:
          return 200809;
        case 27:
        case 246:
        case 127:
        case 128:
        case 23:
        case 24:
        case 160:
        case 161:
        case 181:
        case 182:
        case 242:
        case 183:
        case 184:
        case 243:
        case 244:
        case 245:
        case 165:
        case 178:
        case 179:
        case 49:
        case 50:
        case 168:
        case 169:
        case 175:
        case 170:
        case 171:
        case 172:
        case 97:
        case 76:
        case 32:
        case 173:
        case 35:
          return -1;
        case 176:
        case 177:
        case 7:
        case 155:
        case 8:
        case 157:
        case 125:
        case 126:
        case 92:
        case 93:
        case 129:
        case 130:
        case 131:
        case 94:
        case 91:
          return 1;
        case 74:
        case 60:
        case 69:
        case 70:
        case 4:
          return 1024;
        case 31:
        case 42:
        case 72:
          return 32;
        case 87:
        case 26:
        case 33:
          return 2147483647;
        case 34:
        case 1:
          return 47839;
        case 38:
        case 36:
          return 99;
        case 43:
        case 37:
          return 2048;
        case 0: return 2097152;
        case 3: return 65536;
        case 28: return 32768;
        case 44: return 32767;
        case 75: return 16384;
        case 39: return 1000;
        case 89: return 700;
        case 71: return 256;
        case 40: return 255;
        case 2: return 100;
        case 180: return 64;
        case 25: return 20;
        case 5: return 16;
        case 6: return 6;
        case 73: return 4;
        case 84: {
          if (typeof navigator === 'object') return navigator['hardwareConcurrency'] || 1;
          return 1;
        }
      }
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1;
    }

  var ctlz_i8 = allocate([8,7,6,6,5,5,5,5,4,4,4,4,4,4,4,4,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_STATIC); 
  Module["_llvm_ctlz_i32"] = _llvm_ctlz_i32;

  var _BDtoIHigh=true;

  var _BDtoILow=true;

   
  Module["_bitshift64Lshr"] = _bitshift64Lshr;

  function _abort() {
      Module['abort']();
    }

   
  Module["_strlen"] = _strlen;

  
  function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.set(HEAPU8.subarray(src, src+num), dest);
      return dest;
    } 
  Module["_memcpy"] = _memcpy;

   
  Module["_strncpy"] = _strncpy;

  function ___assert_fail(condition, filename, line, func) {
      ABORT = true;
      throw 'Assertion failed: ' + Pointer_stringify(condition) + ', at: ' + [filename ? Pointer_stringify(filename) : 'unknown filename', line, func ? Pointer_stringify(func) : 'unknown function'] + ' at ' + stackTrace();
    }

  function _sbrk(bytes) {
      // Implement a Linux-like 'memory area' for our 'process'.
      // Changes the size of the memory area by |bytes|; returns the
      // address of the previous top ('break') of the memory area
      // We control the "dynamic" memory - DYNAMIC_BASE to DYNAMICTOP
      var self = _sbrk;
      if (!self.called) {
        DYNAMICTOP = alignMemoryPage(DYNAMICTOP); // make sure we start out aligned
        self.called = true;
        assert(Runtime.dynamicAlloc);
        self.alloc = Runtime.dynamicAlloc;
        Runtime.dynamicAlloc = function() { abort('cannot dynamically allocate, sbrk now has control') };
      }
      var ret = DYNAMICTOP;
      if (bytes != 0) self.alloc(bytes);
      return ret;  // Previous break location.
    }

  function ___errno_location() {
      return ___errno_state;
    }

  var _llvm_pow_f32=Math_pow;

  
  
  
  var ERRNO_MESSAGES={0:"Success",1:"Not super-user",2:"No such file or directory",3:"No such process",4:"Interrupted system call",5:"I/O error",6:"No such device or address",7:"Arg list too long",8:"Exec format error",9:"Bad file number",10:"No children",11:"No more processes",12:"Not enough core",13:"Permission denied",14:"Bad address",15:"Block device required",16:"Mount device busy",17:"File exists",18:"Cross-device link",19:"No such device",20:"Not a directory",21:"Is a directory",22:"Invalid argument",23:"Too many open files in system",24:"Too many open files",25:"Not a typewriter",26:"Text file busy",27:"File too large",28:"No space left on device",29:"Illegal seek",30:"Read only file system",31:"Too many links",32:"Broken pipe",33:"Math arg out of domain of func",34:"Math result not representable",35:"File locking deadlock error",36:"File or path name too long",37:"No record locks available",38:"Function not implemented",39:"Directory not empty",40:"Too many symbolic links",42:"No message of desired type",43:"Identifier removed",44:"Channel number out of range",45:"Level 2 not synchronized",46:"Level 3 halted",47:"Level 3 reset",48:"Link number out of range",49:"Protocol driver not attached",50:"No CSI structure available",51:"Level 2 halted",52:"Invalid exchange",53:"Invalid request descriptor",54:"Exchange full",55:"No anode",56:"Invalid request code",57:"Invalid slot",59:"Bad font file fmt",60:"Device not a stream",61:"No data (for no delay io)",62:"Timer expired",63:"Out of streams resources",64:"Machine is not on the network",65:"Package not installed",66:"The object is remote",67:"The link has been severed",68:"Advertise error",69:"Srmount error",70:"Communication error on send",71:"Protocol error",72:"Multihop attempted",73:"Cross mount point (not really error)",74:"Trying to read unreadable message",75:"Value too large for defined data type",76:"Given log. name not unique",77:"f.d. invalid for this operation",78:"Remote address changed",79:"Can   access a needed shared lib",80:"Accessing a corrupted shared lib",81:".lib section in a.out corrupted",82:"Attempting to link in too many libs",83:"Attempting to exec a shared library",84:"Illegal byte sequence",86:"Streams pipe error",87:"Too many users",88:"Socket operation on non-socket",89:"Destination address required",90:"Message too long",91:"Protocol wrong type for socket",92:"Protocol not available",93:"Unknown protocol",94:"Socket type not supported",95:"Not supported",96:"Protocol family not supported",97:"Address family not supported by protocol family",98:"Address already in use",99:"Address not available",100:"Network interface is not configured",101:"Network is unreachable",102:"Connection reset by network",103:"Connection aborted",104:"Connection reset by peer",105:"No buffer space available",106:"Socket is already connected",107:"Socket is not connected",108:"Can't send after socket shutdown",109:"Too many references",110:"Connection timed out",111:"Connection refused",112:"Host is down",113:"Host is unreachable",114:"Socket already connected",115:"Connection already in progress",116:"Stale file handle",122:"Quota exceeded",123:"No medium (in tape drive)",125:"Operation canceled",130:"Previous owner died",131:"State not recoverable"};
  
  var TTY={ttys:[],init:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
        //   // device, it always assumes it's a TTY device. because of this, we're forcing
        //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
        //   // with text files until FS.init can be refactored.
        //   process['stdin']['setEncoding']('utf8');
        // }
      },shutdown:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
        //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
        //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
        //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
        //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
        //   process['stdin']['pause']();
        // }
      },register:function (dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops: ops };
        FS.registerDevice(dev, TTY.stream_ops);
      },stream_ops:{open:function (stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          stream.tty = tty;
          stream.seekable = false;
        },close:function (stream) {
          // flush any pending line data
          stream.tty.ops.flush(stream.tty);
        },flush:function (stream) {
          stream.tty.ops.flush(stream.tty);
        },read:function (stream, buffer, offset, length, pos /* ignored */) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            if (result === undefined && bytesRead === 0) {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
            if (result === null || result === undefined) break;
            bytesRead++;
            buffer[offset+i] = result;
          }
          if (bytesRead) {
            stream.node.timestamp = Date.now();
          }
          return bytesRead;
        },write:function (stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          for (var i = 0; i < length; i++) {
            try {
              stream.tty.ops.put_char(stream.tty, buffer[offset+i]);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
          }
          if (length) {
            stream.node.timestamp = Date.now();
          }
          return i;
        }},default_tty_ops:{get_char:function (tty) {
          if (!tty.input.length) {
            var result = null;
            if (ENVIRONMENT_IS_NODE) {
              result = process['stdin']['read']();
              if (!result) {
                if (process['stdin']['_readableState'] && process['stdin']['_readableState']['ended']) {
                  return null;  // EOF
                }
                return undefined;  // no data available
              }
            } else if (typeof window != 'undefined' &&
              typeof window.prompt == 'function') {
              // Browser.
              result = window.prompt('Input: ');  // returns null on cancel
              if (result !== null) {
                result += '\n';
              }
            } else if (typeof readline == 'function') {
              // Command line.
              result = readline();
              if (result !== null) {
                result += '\n';
              }
            }
            if (!result) {
              return null;
            }
            tty.input = intArrayFromString(result, true);
          }
          return tty.input.shift();
        },flush:function (tty) {
          if (tty.output && tty.output.length > 0) {
            Module['print'](tty.output.join(''));
            tty.output = [];
          }
        },put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['print'](tty.output.join(''));
            tty.output = [];
          } else {
            tty.output.push(TTY.utf8.processCChar(val));
          }
        }},default_tty1_ops:{put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['printErr'](tty.output.join(''));
            tty.output = [];
          } else {
            tty.output.push(TTY.utf8.processCChar(val));
          }
        },flush:function (tty) {
          if (tty.output && tty.output.length > 0) {
            Module['printErr'](tty.output.join(''));
            tty.output = [];
          }
        }}};
  
  var MEMFS={ops_table:null,mount:function (mount) {
        return MEMFS.createNode(null, '/', 16384 | 511 /* 0777 */, 0);
      },createNode:function (parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          // no supported
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (!MEMFS.ops_table) {
          MEMFS.ops_table = {
            dir: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                lookup: MEMFS.node_ops.lookup,
                mknod: MEMFS.node_ops.mknod,
                rename: MEMFS.node_ops.rename,
                unlink: MEMFS.node_ops.unlink,
                rmdir: MEMFS.node_ops.rmdir,
                readdir: MEMFS.node_ops.readdir,
                symlink: MEMFS.node_ops.symlink
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek
              }
            },
            file: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek,
                read: MEMFS.stream_ops.read,
                write: MEMFS.stream_ops.write,
                allocate: MEMFS.stream_ops.allocate,
                mmap: MEMFS.stream_ops.mmap
              }
            },
            link: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                readlink: MEMFS.node_ops.readlink
              },
              stream: {}
            },
            chrdev: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: FS.chrdev_stream_ops
            }
          };
        }
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node;
          node.stream_ops = MEMFS.ops_table.dir.stream;
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node;
          node.stream_ops = MEMFS.ops_table.file.stream;
          node.usedBytes = 0; // The actual number of bytes used in the typed array, as opposed to contents.buffer.byteLength which gives the whole capacity.
          // When the byte data of the file is populated, this will point to either a typed array, or a normal JS array. Typed arrays are preferred
          // for performance, and used by default. However, typed arrays are not resizable like normal JS arrays are, so there is a small disk size
          // penalty involved for appending file writes that continuously grow a file similar to std::vector capacity vs used -scheme.
          node.contents = null; 
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node;
          node.stream_ops = MEMFS.ops_table.link.stream;
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node;
          node.stream_ops = MEMFS.ops_table.chrdev.stream;
        }
        node.timestamp = Date.now();
        // add the new node to the parent
        if (parent) {
          parent.contents[name] = node;
        }
        return node;
      },getFileDataAsRegularArray:function (node) {
        if (node.contents && node.contents.subarray) {
          var arr = [];
          for (var i = 0; i < node.usedBytes; ++i) arr.push(node.contents[i]);
          return arr; // Returns a copy of the original data.
        }
        return node.contents; // No-op, the file contents are already in a JS array. Return as-is.
      },getFileDataAsTypedArray:function (node) {
        if (!node.contents) return new Uint8Array;
        if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes); // Make sure to not return excess unused bytes.
        return new Uint8Array(node.contents);
      },expandFileStorage:function (node, newCapacity) {
  
        // If we are asked to expand the size of a file that already exists, revert to using a standard JS array to store the file
        // instead of a typed array. This makes resizing the array more flexible because we can just .push() elements at the back to
        // increase the size.
        if (node.contents && node.contents.subarray && newCapacity > node.contents.length) {
          node.contents = MEMFS.getFileDataAsRegularArray(node);
          node.usedBytes = node.contents.length; // We might be writing to a lazy-loaded file which had overridden this property, so force-reset it.
        }
  
        if (!node.contents || node.contents.subarray) { // Keep using a typed array if creating a new storage, or if old one was a typed array as well.
          var prevCapacity = node.contents ? node.contents.buffer.byteLength : 0;
          if (prevCapacity >= newCapacity) return; // No need to expand, the storage was already large enough.
          // Don't expand strictly to the given requested limit if it's only a very small increase, but instead geometrically grow capacity.
          // For small filesizes (<1MB), perform size*2 geometric increase, but for large sizes, do a much more conservative size*1.125 increase to
          // avoid overshooting the allocation cap by a very large margin.
          var CAPACITY_DOUBLING_MAX = 1024 * 1024;
          newCapacity = Math.max(newCapacity, (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2.0 : 1.125)) | 0);
          if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256); // At minimum allocate 256b for each file when expanding.
          var oldContents = node.contents;
          node.contents = new Uint8Array(newCapacity); // Allocate new storage.
          if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0); // Copy old data over to the new storage.
          return;
        }
        // Not using a typed array to back the file storage. Use a standard JS array instead.
        if (!node.contents && newCapacity > 0) node.contents = [];
        while (node.contents.length < newCapacity) node.contents.push(0);
      },resizeFileStorage:function (node, newSize) {
        if (node.usedBytes == newSize) return;
        if (newSize == 0) {
          node.contents = null; // Fully decommit when requesting a resize to zero.
          node.usedBytes = 0;
          return;
        }
  
        if (!node.contents || node.contents.subarray) { // Resize a typed array if that is being used as the backing store.
          var oldContents = node.contents;
          node.contents = new Uint8Array(new ArrayBuffer(newSize)); // Allocate new storage.
          if (oldContents) {
            node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes))); // Copy old data over to the new storage.
          }
          node.usedBytes = newSize;
          return;
        }
        // Backing with a JS array.
        if (!node.contents) node.contents = [];
        if (node.contents.length > newSize) node.contents.length = newSize;
        else while (node.contents.length < newSize) node.contents.push(0);
        node.usedBytes = newSize;
      },node_ops:{getattr:function (node) {
          var attr = {};
          // device numbers reuse inode numbers.
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) {
            attr.size = 4096;
          } else if (FS.isFile(node.mode)) {
            attr.size = node.usedBytes;
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length;
          } else {
            attr.size = 0;
          }
          attr.atime = new Date(node.timestamp);
          attr.mtime = new Date(node.timestamp);
          attr.ctime = new Date(node.timestamp);
          // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
          //       but this is not required by the standard.
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },setattr:function (node, attr) {
          if (attr.mode !== undefined) {
            node.mode = attr.mode;
          }
          if (attr.timestamp !== undefined) {
            node.timestamp = attr.timestamp;
          }
          if (attr.size !== undefined) {
            MEMFS.resizeFileStorage(node, attr.size);
          }
        },lookup:function (parent, name) {
          throw FS.genericErrors[ERRNO_CODES.ENOENT];
        },mknod:function (parent, name, mode, dev) {
          return MEMFS.createNode(parent, name, mode, dev);
        },rename:function (old_node, new_dir, new_name) {
          // if we're overwriting a directory at new_name, make sure it's empty.
          if (FS.isDir(old_node.mode)) {
            var new_node;
            try {
              new_node = FS.lookupNode(new_dir, new_name);
            } catch (e) {
            }
            if (new_node) {
              for (var i in new_node.contents) {
                throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
              }
            }
          }
          // do the internal rewiring
          delete old_node.parent.contents[old_node.name];
          old_node.name = new_name;
          new_dir.contents[new_name] = old_node;
          old_node.parent = new_dir;
        },unlink:function (parent, name) {
          delete parent.contents[name];
        },rmdir:function (parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
          }
          delete parent.contents[name];
        },readdir:function (node) {
          var entries = ['.', '..']
          for (var key in node.contents) {
            if (!node.contents.hasOwnProperty(key)) {
              continue;
            }
            entries.push(key);
          }
          return entries;
        },symlink:function (parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 511 /* 0777 */ | 40960, 0);
          node.link = oldpath;
          return node;
        },readlink:function (node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return node.link;
        }},stream_ops:{read:function (stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= stream.node.usedBytes) return 0;
          var size = Math.min(stream.node.usedBytes - position, length);
          assert(size >= 0);
          if (size > 8 && contents.subarray) { // non-trivial, and typed array
            buffer.set(contents.subarray(position, position + size), offset);
          } else
          {
            for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
          }
          return size;
        },write:function (stream, buffer, offset, length, position, canOwn) {
          if (!length) return 0;
          var node = stream.node;
          node.timestamp = Date.now();
  
          if (buffer.subarray && (!node.contents || node.contents.subarray)) { // This write is from a typed array to a typed array?
            if (canOwn) { // Can we just reuse the buffer we are given?
              assert(position === 0, 'canOwn must imply no weird position inside the file');
              node.contents = buffer.subarray(offset, offset + length);
              node.usedBytes = length;
              return length;
            } else if (node.usedBytes === 0 && position === 0) { // If this is a simple first write to an empty file, do a fast set since we don't need to care about old data.
              node.contents = new Uint8Array(buffer.subarray(offset, offset + length));
              node.usedBytes = length;
              return length;
            } else if (position + length <= node.usedBytes) { // Writing to an already allocated and used subrange of the file?
              node.contents.set(buffer.subarray(offset, offset + length), position);
              return length;
            }
          }
          // Appending to an existing file and we need to reallocate, or source data did not come as a typed array.
          MEMFS.expandFileStorage(node, position+length);
          if (node.contents.subarray && buffer.subarray) node.contents.set(buffer.subarray(offset, offset + length), position); // Use typed array write if available.
          else
            for (var i = 0; i < length; i++) {
             node.contents[position + i] = buffer[offset + i]; // Or fall back to manual write if not.
            }
          node.usedBytes = Math.max(node.usedBytes, position+length);
          return length;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.usedBytes;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return position;
        },allocate:function (stream, offset, length) {
          MEMFS.expandFileStorage(stream.node, offset + length);
          stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
        },mmap:function (stream, buffer, offset, length, position, prot, flags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          // Only make a new copy when MAP_PRIVATE is specified.
          if ( !(flags & 2) &&
                (contents.buffer === buffer || contents.buffer === buffer.buffer) ) {
            // We can't emulate MAP_SHARED when the file is not backed by the buffer
            // we're mapping to (e.g. the HEAP buffer).
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            // Try to avoid unnecessary slices.
            if (position > 0 || position + length < stream.node.usedBytes) {
              if (contents.subarray) {
                contents = contents.subarray(position, position + length);
              } else {
                contents = Array.prototype.slice.call(contents, position, position + length);
              }
            }
            allocated = true;
            ptr = _malloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOMEM);
            }
            buffer.set(contents, ptr);
          }
          return { ptr: ptr, allocated: allocated };
        }}};
  
  var IDBFS={dbs:{},indexedDB:function () {
        if (typeof indexedDB !== 'undefined') return indexedDB;
        var ret = null;
        if (typeof window === 'object') ret = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        assert(ret, 'IDBFS used, but indexedDB not supported');
        return ret;
      },DB_VERSION:21,DB_STORE_NAME:"FILE_DATA",mount:function (mount) {
        // reuse all of the core MEMFS functionality
        return MEMFS.mount.apply(null, arguments);
      },syncfs:function (mount, populate, callback) {
        IDBFS.getLocalSet(mount, function(err, local) {
          if (err) return callback(err);
  
          IDBFS.getRemoteSet(mount, function(err, remote) {
            if (err) return callback(err);
  
            var src = populate ? remote : local;
            var dst = populate ? local : remote;
  
            IDBFS.reconcile(src, dst, callback);
          });
        });
      },getDB:function (name, callback) {
        // check the cache first
        var db = IDBFS.dbs[name];
        if (db) {
          return callback(null, db);
        }
  
        var req;
        try {
          req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION);
        } catch (e) {
          return callback(e);
        }
        req.onupgradeneeded = function(e) {
          var db = e.target.result;
          var transaction = e.target.transaction;
  
          var fileStore;
  
          if (db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {
            fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME);
          } else {
            fileStore = db.createObjectStore(IDBFS.DB_STORE_NAME);
          }
  
          fileStore.createIndex('timestamp', 'timestamp', { unique: false });
        };
        req.onsuccess = function() {
          db = req.result;
  
          // add to the cache
          IDBFS.dbs[name] = db;
          callback(null, db);
        };
        req.onerror = function() {
          callback(this.error);
        };
      },getLocalSet:function (mount, callback) {
        var entries = {};
  
        function isRealDir(p) {
          return p !== '.' && p !== '..';
        };
        function toAbsolute(root) {
          return function(p) {
            return PATH.join2(root, p);
          }
        };
  
        var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));
  
        while (check.length) {
          var path = check.pop();
          var stat;
  
          try {
            stat = FS.stat(path);
          } catch (e) {
            return callback(e);
          }
  
          if (FS.isDir(stat.mode)) {
            check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)));
          }
  
          entries[path] = { timestamp: stat.mtime };
        }
  
        return callback(null, { type: 'local', entries: entries });
      },getRemoteSet:function (mount, callback) {
        var entries = {};
  
        IDBFS.getDB(mount.mountpoint, function(err, db) {
          if (err) return callback(err);
  
          var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readonly');
          transaction.onerror = function() { callback(this.error); };
  
          var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
          var index = store.index('timestamp');
  
          index.openKeyCursor().onsuccess = function(event) {
            var cursor = event.target.result;
  
            if (!cursor) {
              return callback(null, { type: 'remote', db: db, entries: entries });
            }
  
            entries[cursor.primaryKey] = { timestamp: cursor.key };
  
            cursor.continue();
          };
        });
      },loadLocalEntry:function (path, callback) {
        var stat, node;
  
        try {
          var lookup = FS.lookupPath(path);
          node = lookup.node;
          stat = FS.stat(path);
        } catch (e) {
          return callback(e);
        }
  
        if (FS.isDir(stat.mode)) {
          return callback(null, { timestamp: stat.mtime, mode: stat.mode });
        } else if (FS.isFile(stat.mode)) {
          // Performance consideration: storing a normal JavaScript array to a IndexedDB is much slower than storing a typed array.
          // Therefore always convert the file contents to a typed array first before writing the data to IndexedDB.
          node.contents = MEMFS.getFileDataAsTypedArray(node);
          return callback(null, { timestamp: stat.mtime, mode: stat.mode, contents: node.contents });
        } else {
          return callback(new Error('node type not supported'));
        }
      },storeLocalEntry:function (path, entry, callback) {
        try {
          if (FS.isDir(entry.mode)) {
            FS.mkdir(path, entry.mode);
          } else if (FS.isFile(entry.mode)) {
            FS.writeFile(path, entry.contents, { encoding: 'binary', canOwn: true });
          } else {
            return callback(new Error('node type not supported'));
          }
  
          FS.chmod(path, entry.mode);
          FS.utime(path, entry.timestamp, entry.timestamp);
        } catch (e) {
          return callback(e);
        }
  
        callback(null);
      },removeLocalEntry:function (path, callback) {
        try {
          var lookup = FS.lookupPath(path);
          var stat = FS.stat(path);
  
          if (FS.isDir(stat.mode)) {
            FS.rmdir(path);
          } else if (FS.isFile(stat.mode)) {
            FS.unlink(path);
          }
        } catch (e) {
          return callback(e);
        }
  
        callback(null);
      },loadRemoteEntry:function (store, path, callback) {
        var req = store.get(path);
        req.onsuccess = function(event) { callback(null, event.target.result); };
        req.onerror = function() { callback(this.error); };
      },storeRemoteEntry:function (store, path, entry, callback) {
        var req = store.put(entry, path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function() { callback(this.error); };
      },removeRemoteEntry:function (store, path, callback) {
        var req = store.delete(path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function() { callback(this.error); };
      },reconcile:function (src, dst, callback) {
        var total = 0;
  
        var create = [];
        Object.keys(src.entries).forEach(function (key) {
          var e = src.entries[key];
          var e2 = dst.entries[key];
          if (!e2 || e.timestamp > e2.timestamp) {
            create.push(key);
            total++;
          }
        });
  
        var remove = [];
        Object.keys(dst.entries).forEach(function (key) {
          var e = dst.entries[key];
          var e2 = src.entries[key];
          if (!e2) {
            remove.push(key);
            total++;
          }
        });
  
        if (!total) {
          return callback(null);
        }
  
        var errored = false;
        var completed = 0;
        var db = src.type === 'remote' ? src.db : dst.db;
        var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readwrite');
        var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
  
        function done(err) {
          if (err) {
            if (!done.errored) {
              done.errored = true;
              return callback(err);
            }
            return;
          }
          if (++completed >= total) {
            return callback(null);
          }
        };
  
        transaction.onerror = function() { done(this.error); };
  
        // sort paths in ascending order so directory entries are created
        // before the files inside them
        create.sort().forEach(function (path) {
          if (dst.type === 'local') {
            IDBFS.loadRemoteEntry(store, path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeLocalEntry(path, entry, done);
            });
          } else {
            IDBFS.loadLocalEntry(path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeRemoteEntry(store, path, entry, done);
            });
          }
        });
  
        // sort paths in descending order so files are deleted before their
        // parent directories
        remove.sort().reverse().forEach(function(path) {
          if (dst.type === 'local') {
            IDBFS.removeLocalEntry(path, done);
          } else {
            IDBFS.removeRemoteEntry(store, path, done);
          }
        });
      }};
  
  var NODEFS={isWindows:false,staticInit:function () {
        NODEFS.isWindows = !!process.platform.match(/^win/);
      },mount:function (mount) {
        assert(ENVIRONMENT_IS_NODE);
        return NODEFS.createNode(null, '/', NODEFS.getMode(mount.opts.root), 0);
      },createNode:function (parent, name, mode, dev) {
        if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node = FS.createNode(parent, name, mode);
        node.node_ops = NODEFS.node_ops;
        node.stream_ops = NODEFS.stream_ops;
        return node;
      },getMode:function (path) {
        var stat;
        try {
          stat = fs.lstatSync(path);
          if (NODEFS.isWindows) {
            // On Windows, directories return permission bits 'rw-rw-rw-', even though they have 'rwxrwxrwx', so 
            // propagate write bits to execute bits.
            stat.mode = stat.mode | ((stat.mode & 146) >> 1);
          }
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code]);
        }
        return stat.mode;
      },realPath:function (node) {
        var parts = [];
        while (node.parent !== node) {
          parts.push(node.name);
          node = node.parent;
        }
        parts.push(node.mount.opts.root);
        parts.reverse();
        return PATH.join.apply(null, parts);
      },flagsToPermissionStringMap:{0:"r",1:"r+",2:"r+",64:"r",65:"r+",66:"r+",129:"rx+",193:"rx+",514:"w+",577:"w",578:"w+",705:"wx",706:"wx+",1024:"a",1025:"a",1026:"a+",1089:"a",1090:"a+",1153:"ax",1154:"ax+",1217:"ax",1218:"ax+",4096:"rs",4098:"rs+"},flagsToPermissionString:function (flags) {
        if (flags in NODEFS.flagsToPermissionStringMap) {
          return NODEFS.flagsToPermissionStringMap[flags];
        } else {
          return flags;
        }
      },node_ops:{getattr:function (node) {
          var path = NODEFS.realPath(node);
          var stat;
          try {
            stat = fs.lstatSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          // node.js v0.10.20 doesn't report blksize and blocks on Windows. Fake them with default blksize of 4096.
          // See http://support.microsoft.com/kb/140365
          if (NODEFS.isWindows && !stat.blksize) {
            stat.blksize = 4096;
          }
          if (NODEFS.isWindows && !stat.blocks) {
            stat.blocks = (stat.size+stat.blksize-1)/stat.blksize|0;
          }
          return {
            dev: stat.dev,
            ino: stat.ino,
            mode: stat.mode,
            nlink: stat.nlink,
            uid: stat.uid,
            gid: stat.gid,
            rdev: stat.rdev,
            size: stat.size,
            atime: stat.atime,
            mtime: stat.mtime,
            ctime: stat.ctime,
            blksize: stat.blksize,
            blocks: stat.blocks
          };
        },setattr:function (node, attr) {
          var path = NODEFS.realPath(node);
          try {
            if (attr.mode !== undefined) {
              fs.chmodSync(path, attr.mode);
              // update the common node structure mode as well
              node.mode = attr.mode;
            }
            if (attr.timestamp !== undefined) {
              var date = new Date(attr.timestamp);
              fs.utimesSync(path, date, date);
            }
            if (attr.size !== undefined) {
              fs.truncateSync(path, attr.size);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },lookup:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          var mode = NODEFS.getMode(path);
          return NODEFS.createNode(parent, name, mode);
        },mknod:function (parent, name, mode, dev) {
          var node = NODEFS.createNode(parent, name, mode, dev);
          // create the backing node for this in the fs root as well
          var path = NODEFS.realPath(node);
          try {
            if (FS.isDir(node.mode)) {
              fs.mkdirSync(path, node.mode);
            } else {
              fs.writeFileSync(path, '', { mode: node.mode });
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return node;
        },rename:function (oldNode, newDir, newName) {
          var oldPath = NODEFS.realPath(oldNode);
          var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
          try {
            fs.renameSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },unlink:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.unlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },rmdir:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.rmdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readdir:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },symlink:function (parent, newName, oldPath) {
          var newPath = PATH.join2(NODEFS.realPath(parent), newName);
          try {
            fs.symlinkSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readlink:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        }},stream_ops:{open:function (stream) {
          var path = NODEFS.realPath(stream.node);
          try {
            if (FS.isFile(stream.node.mode)) {
              stream.nfd = fs.openSync(path, NODEFS.flagsToPermissionString(stream.flags));
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },close:function (stream) {
          try {
            if (FS.isFile(stream.node.mode) && stream.nfd) {
              fs.closeSync(stream.nfd);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },read:function (stream, buffer, offset, length, position) {
          if (length === 0) return 0; // node errors on 0 length reads
          // FIXME this is terrible.
          var nbuffer = new Buffer(length);
          var res;
          try {
            res = fs.readSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          if (res > 0) {
            for (var i = 0; i < res; i++) {
              buffer[offset + i] = nbuffer[i];
            }
          }
          return res;
        },write:function (stream, buffer, offset, length, position) {
          // FIXME this is terrible.
          var nbuffer = new Buffer(buffer.subarray(offset, offset + length));
          var res;
          try {
            res = fs.writeSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return res;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              try {
                var stat = fs.fstatSync(stream.nfd);
                position += stat.size;
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES[e.code]);
              }
            }
          }
  
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
  
          return position;
        }}};
  
  var _stdin=allocate(1, "i32*", ALLOC_STATIC);
  
  var _stdout=allocate(1, "i32*", ALLOC_STATIC);
  
  var _stderr=allocate(1, "i32*", ALLOC_STATIC);
  
  function _fflush(stream) {
      // int fflush(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fflush.html
  
      /*
      // Disabled, see https://github.com/kripken/emscripten/issues/2770
      stream = FS.getStreamFromPtr(stream);
      if (stream.stream_ops.flush) {
        stream.stream_ops.flush(stream);
      }
      */
    }var FS={root:null,mounts:[],devices:[null],streams:[],nextInode:1,nameTable:null,currentPath:"/",initialized:false,ignorePermissions:true,trackingDelegate:{},tracking:{openFlags:{READ:1,WRITE:2}},ErrnoError:null,genericErrors:{},handleFSError:function (e) {
        if (!(e instanceof FS.ErrnoError)) throw e + ' : ' + stackTrace();
        return ___setErrNo(e.errno);
      },lookupPath:function (path, opts) {
        path = PATH.resolve(FS.cwd(), path);
        opts = opts || {};
  
        if (!path) return { path: '', node: null };
  
        var defaults = {
          follow_mount: true,
          recurse_count: 0
        };
        for (var key in defaults) {
          if (opts[key] === undefined) {
            opts[key] = defaults[key];
          }
        }
  
        if (opts.recurse_count > 8) {  // max recursive lookup of 8
          throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
        }
  
        // split the path
        var parts = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), false);
  
        // start at the root
        var current = FS.root;
        var current_path = '/';
  
        for (var i = 0; i < parts.length; i++) {
          var islast = (i === parts.length-1);
          if (islast && opts.parent) {
            // stop resolving
            break;
          }
  
          current = FS.lookupNode(current, parts[i]);
          current_path = PATH.join2(current_path, parts[i]);
  
          // jump to the mount's root node if this is a mountpoint
          if (FS.isMountpoint(current)) {
            if (!islast || (islast && opts.follow_mount)) {
              current = current.mounted.root;
            }
          }
  
          // by default, lookupPath will not follow a symlink if it is the final path component.
          // setting opts.follow = true will override this behavior.
          if (!islast || opts.follow) {
            var count = 0;
            while (FS.isLink(current.mode)) {
              var link = FS.readlink(current_path);
              current_path = PATH.resolve(PATH.dirname(current_path), link);
              
              var lookup = FS.lookupPath(current_path, { recurse_count: opts.recurse_count });
              current = lookup.node;
  
              if (count++ > 40) {  // limit max consecutive symlinks to 40 (SYMLOOP_MAX).
                throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
              }
            }
          }
        }
  
        return { path: current_path, node: current };
      },getPath:function (node) {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint;
            if (!path) return mount;
            return mount[mount.length-1] !== '/' ? mount + '/' + path : mount + path;
          }
          path = path ? node.name + '/' + path : node.name;
          node = node.parent;
        }
      },hashName:function (parentid, name) {
        var hash = 0;
  
  
        for (var i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
        }
        return ((parentid + hash) >>> 0) % FS.nameTable.length;
      },hashAddNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },hashRemoveNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next;
        } else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },lookupNode:function (parent, name) {
        var err = FS.mayLookup(parent);
        if (err) {
          throw new FS.ErrnoError(err, parent);
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) {
            return node;
          }
        }
        // if we failed to find it in the cache, call into the VFS
        return FS.lookup(parent, name);
      },createNode:function (parent, name, mode, rdev) {
        if (!FS.FSNode) {
          FS.FSNode = function(parent, name, mode, rdev) {
            if (!parent) {
              parent = this;  // root node sets parent to itself
            }
            this.parent = parent;
            this.mount = parent.mount;
            this.mounted = null;
            this.id = FS.nextInode++;
            this.name = name;
            this.mode = mode;
            this.node_ops = {};
            this.stream_ops = {};
            this.rdev = rdev;
          };
  
          FS.FSNode.prototype = {};
  
          // compatibility
          var readMode = 292 | 73;
          var writeMode = 146;
  
          // NOTE we must use Object.defineProperties instead of individual calls to
          // Object.defineProperty in order to make closure compiler happy
          Object.defineProperties(FS.FSNode.prototype, {
            read: {
              get: function() { return (this.mode & readMode) === readMode; },
              set: function(val) { val ? this.mode |= readMode : this.mode &= ~readMode; }
            },
            write: {
              get: function() { return (this.mode & writeMode) === writeMode; },
              set: function(val) { val ? this.mode |= writeMode : this.mode &= ~writeMode; }
            },
            isFolder: {
              get: function() { return FS.isDir(this.mode); }
            },
            isDevice: {
              get: function() { return FS.isChrdev(this.mode); }
            }
          });
        }
  
        var node = new FS.FSNode(parent, name, mode, rdev);
  
        FS.hashAddNode(node);
  
        return node;
      },destroyNode:function (node) {
        FS.hashRemoveNode(node);
      },isRoot:function (node) {
        return node === node.parent;
      },isMountpoint:function (node) {
        return !!node.mounted;
      },isFile:function (mode) {
        return (mode & 61440) === 32768;
      },isDir:function (mode) {
        return (mode & 61440) === 16384;
      },isLink:function (mode) {
        return (mode & 61440) === 40960;
      },isChrdev:function (mode) {
        return (mode & 61440) === 8192;
      },isBlkdev:function (mode) {
        return (mode & 61440) === 24576;
      },isFIFO:function (mode) {
        return (mode & 61440) === 4096;
      },isSocket:function (mode) {
        return (mode & 49152) === 49152;
      },flagModes:{"r":0,"rs":1052672,"r+":2,"w":577,"wx":705,"xw":705,"w+":578,"wx+":706,"xw+":706,"a":1089,"ax":1217,"xa":1217,"a+":1090,"ax+":1218,"xa+":1218},modeStringToFlags:function (str) {
        var flags = FS.flagModes[str];
        if (typeof flags === 'undefined') {
          throw new Error('Unknown file open mode: ' + str);
        }
        return flags;
      },flagsToPermissionString:function (flag) {
        var accmode = flag & 2097155;
        var perms = ['r', 'w', 'rw'][accmode];
        if ((flag & 512)) {
          perms += 'w';
        }
        return perms;
      },nodePermissions:function (node, perms) {
        if (FS.ignorePermissions) {
          return 0;
        }
        // return 0 if any user, group or owner bits are set.
        if (perms.indexOf('r') !== -1 && !(node.mode & 292)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('w') !== -1 && !(node.mode & 146)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('x') !== -1 && !(node.mode & 73)) {
          return ERRNO_CODES.EACCES;
        }
        return 0;
      },mayLookup:function (dir) {
        var err = FS.nodePermissions(dir, 'x');
        if (err) return err;
        if (!dir.node_ops.lookup) return ERRNO_CODES.EACCES;
        return 0;
      },mayCreate:function (dir, name) {
        try {
          var node = FS.lookupNode(dir, name);
          return ERRNO_CODES.EEXIST;
        } catch (e) {
        }
        return FS.nodePermissions(dir, 'wx');
      },mayDelete:function (dir, name, isdir) {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var err = FS.nodePermissions(dir, 'wx');
        if (err) {
          return err;
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return ERRNO_CODES.ENOTDIR;
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return ERRNO_CODES.EBUSY;
          }
        } else {
          if (FS.isDir(node.mode)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return 0;
      },mayOpen:function (node, flags) {
        if (!node) {
          return ERRNO_CODES.ENOENT;
        }
        if (FS.isLink(node.mode)) {
          return ERRNO_CODES.ELOOP;
        } else if (FS.isDir(node.mode)) {
          if ((flags & 2097155) !== 0 ||  // opening for write
              (flags & 512)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
      },MAX_OPEN_FDS:4096,nextfd:function (fd_start, fd_end) {
        fd_start = fd_start || 0;
        fd_end = fd_end || FS.MAX_OPEN_FDS;
        for (var fd = fd_start; fd <= fd_end; fd++) {
          if (!FS.streams[fd]) {
            return fd;
          }
        }
        throw new FS.ErrnoError(ERRNO_CODES.EMFILE);
      },getStream:function (fd) {
        return FS.streams[fd];
      },createStream:function (stream, fd_start, fd_end) {
        if (!FS.FSStream) {
          FS.FSStream = function(){};
          FS.FSStream.prototype = {};
          // compatibility
          Object.defineProperties(FS.FSStream.prototype, {
            object: {
              get: function() { return this.node; },
              set: function(val) { this.node = val; }
            },
            isRead: {
              get: function() { return (this.flags & 2097155) !== 1; }
            },
            isWrite: {
              get: function() { return (this.flags & 2097155) !== 0; }
            },
            isAppend: {
              get: function() { return (this.flags & 1024); }
            }
          });
        }
        // clone it, so we can return an instance of FSStream
        var newStream = new FS.FSStream();
        for (var p in stream) {
          newStream[p] = stream[p];
        }
        stream = newStream;
        var fd = FS.nextfd(fd_start, fd_end);
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },closeStream:function (fd) {
        FS.streams[fd] = null;
      },getStreamFromPtr:function (ptr) {
        return FS.streams[ptr - 1];
      },getPtrForStream:function (stream) {
        return stream ? stream.fd + 1 : 0;
      },chrdev_stream_ops:{open:function (stream) {
          var device = FS.getDevice(stream.node.rdev);
          // override node's stream ops with the device's
          stream.stream_ops = device.stream_ops;
          // forward the open call
          if (stream.stream_ops.open) {
            stream.stream_ops.open(stream);
          }
        },llseek:function () {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }},major:function (dev) {
        return ((dev) >> 8);
      },minor:function (dev) {
        return ((dev) & 0xff);
      },makedev:function (ma, mi) {
        return ((ma) << 8 | (mi));
      },registerDevice:function (dev, ops) {
        FS.devices[dev] = { stream_ops: ops };
      },getDevice:function (dev) {
        return FS.devices[dev];
      },getMounts:function (mount) {
        var mounts = [];
        var check = [mount];
  
        while (check.length) {
          var m = check.pop();
  
          mounts.push(m);
  
          check.push.apply(check, m.mounts);
        }
  
        return mounts;
      },syncfs:function (populate, callback) {
        if (typeof(populate) === 'function') {
          callback = populate;
          populate = false;
        }
  
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;
  
        function done(err) {
          if (err) {
            if (!done.errored) {
              done.errored = true;
              return callback(err);
            }
            return;
          }
          if (++completed >= mounts.length) {
            callback(null);
          }
        };
  
        // sync all mounts
        mounts.forEach(function (mount) {
          if (!mount.type.syncfs) {
            return done(null);
          }
          mount.type.syncfs(mount, populate, done);
        });
      },mount:function (type, opts, mountpoint) {
        var root = mountpoint === '/';
        var pseudo = !mountpoint;
        var node;
  
        if (root && FS.root) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        } else if (!root && !pseudo) {
          var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
          mountpoint = lookup.path;  // use the absolute path
          node = lookup.node;
  
          if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
          }
  
          if (!FS.isDir(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
          }
        }
  
        var mount = {
          type: type,
          opts: opts,
          mountpoint: mountpoint,
          mounts: []
        };
  
        // create a root node for the fs
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
  
        if (root) {
          FS.root = mountRoot;
        } else if (node) {
          // set as a mountpoint
          node.mounted = mount;
  
          // add the new mount to the current mount's children
          if (node.mount) {
            node.mount.mounts.push(mount);
          }
        }
  
        return mountRoot;
      },unmount:function (mountpoint) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
        if (!FS.isMountpoint(lookup.node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
  
        // destroy the nodes for this mount, and all its child mounts
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
  
        Object.keys(FS.nameTable).forEach(function (hash) {
          var current = FS.nameTable[hash];
  
          while (current) {
            var next = current.name_next;
  
            if (mounts.indexOf(current.mount) !== -1) {
              FS.destroyNode(current);
            }
  
            current = next;
          }
        });
  
        // no longer a mountpoint
        node.mounted = null;
  
        // remove this mount from the child mounts
        var idx = node.mount.mounts.indexOf(mount);
        assert(idx !== -1);
        node.mount.mounts.splice(idx, 1);
      },lookup:function (parent, name) {
        return parent.node_ops.lookup(parent, name);
      },mknod:function (path, mode, dev) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        if (!name || name === '.' || name === '..') {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var err = FS.mayCreate(parent, name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.mknod(parent, name, mode, dev);
      },create:function (path, mode) {
        mode = mode !== undefined ? mode : 438 /* 0666 */;
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },mkdir:function (path, mode) {
        mode = mode !== undefined ? mode : 511 /* 0777 */;
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },mkdev:function (path, mode, dev) {
        if (typeof(dev) === 'undefined') {
          dev = mode;
          mode = 438 /* 0666 */;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },symlink:function (oldpath, newpath) {
        if (!PATH.resolve(oldpath)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        var newname = PATH.basename(newpath);
        var err = FS.mayCreate(parent, newname);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.symlink(parent, newname, oldpath);
      },rename:function (old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        // parents must exist
        var lookup, old_dir, new_dir;
        try {
          lookup = FS.lookupPath(old_path, { parent: true });
          old_dir = lookup.node;
          lookup = FS.lookupPath(new_path, { parent: true });
          new_dir = lookup.node;
        } catch (e) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        if (!old_dir || !new_dir) throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        // need to be part of the same mount
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(ERRNO_CODES.EXDEV);
        }
        // source must exist
        var old_node = FS.lookupNode(old_dir, old_name);
        // old path should not be an ancestor of the new path
        var relative = PATH.relative(old_path, new_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        // new path should not be an ancestor of the old path
        relative = PATH.relative(new_path, old_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
        }
        // see if the new path already exists
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
          // not fatal
        }
        // early out if nothing needs to change
        if (old_node === new_node) {
          return;
        }
        // we'll need to delete the old entry
        var isdir = FS.isDir(old_node.mode);
        var err = FS.mayDelete(old_dir, old_name, isdir);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        // need delete permissions if we'll be overwriting.
        // need create permissions if new doesn't already exist.
        err = new_node ?
          FS.mayDelete(new_dir, new_name, isdir) :
          FS.mayCreate(new_dir, new_name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        // if we are going to change the parent, check write permissions
        if (new_dir !== old_dir) {
          err = FS.nodePermissions(old_dir, 'w');
          if (err) {
            throw new FS.ErrnoError(err);
          }
        }
        try {
          if (FS.trackingDelegate['willMovePath']) {
            FS.trackingDelegate['willMovePath'](old_path, new_path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willMovePath']('"+old_path+"', '"+new_path+"') threw an exception: " + e.message);
        }
        // remove the node from the lookup hash
        FS.hashRemoveNode(old_node);
        // do the underlying fs rename
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
        } catch (e) {
          throw e;
        } finally {
          // add the node back to the hash (in case node_ops.rename
          // changed its name)
          FS.hashAddNode(old_node);
        }
        try {
          if (FS.trackingDelegate['onMovePath']) FS.trackingDelegate['onMovePath'](old_path, new_path);
        } catch(e) {
          console.log("FS.trackingDelegate['onMovePath']('"+old_path+"', '"+new_path+"') threw an exception: " + e.message);
        }
      },rmdir:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, true);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        try {
          if (FS.trackingDelegate['willDeletePath']) {
            FS.trackingDelegate['willDeletePath'](path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willDeletePath']('"+path+"') threw an exception: " + e.message);
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
        try {
          if (FS.trackingDelegate['onDeletePath']) FS.trackingDelegate['onDeletePath'](path);
        } catch(e) {
          console.log("FS.trackingDelegate['onDeletePath']('"+path+"') threw an exception: " + e.message);
        }
      },readdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        if (!node.node_ops.readdir) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        return node.node_ops.readdir(node);
      },unlink:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, false);
        if (err) {
          // POSIX says unlink should set EPERM, not EISDIR
          if (err === ERRNO_CODES.EISDIR) err = ERRNO_CODES.EPERM;
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        try {
          if (FS.trackingDelegate['willDeletePath']) {
            FS.trackingDelegate['willDeletePath'](path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willDeletePath']('"+path+"') threw an exception: " + e.message);
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
        try {
          if (FS.trackingDelegate['onDeletePath']) FS.trackingDelegate['onDeletePath'](path);
        } catch(e) {
          console.log("FS.trackingDelegate['onDeletePath']('"+path+"') threw an exception: " + e.message);
        }
      },readlink:function (path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        return link.node_ops.readlink(link);
      },stat:function (path, dontFollow) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        if (!node) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        if (!node.node_ops.getattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return node.node_ops.getattr(node);
      },lstat:function (path) {
        return FS.stat(path, true);
      },chmod:function (path, mode, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          mode: (mode & 4095) | (node.mode & ~4095),
          timestamp: Date.now()
        });
      },lchmod:function (path, mode) {
        FS.chmod(path, mode, true);
      },fchmod:function (fd, mode) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chmod(stream.node, mode);
      },chown:function (path, uid, gid, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          timestamp: Date.now()
          // we ignore the uid / gid for now
        });
      },lchown:function (path, uid, gid) {
        FS.chown(path, uid, gid, true);
      },fchown:function (fd, uid, gid) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chown(stream.node, uid, gid);
      },truncate:function (path, len) {
        if (len < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var err = FS.nodePermissions(node, 'w');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        node.node_ops.setattr(node, {
          size: len,
          timestamp: Date.now()
        });
      },ftruncate:function (fd, len) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        FS.truncate(stream.node, len);
      },utime:function (path, atime, mtime) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        node.node_ops.setattr(node, {
          timestamp: Math.max(atime, mtime)
        });
      },open:function (path, flags, mode, fd_start, fd_end) {
        if (path === "") {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        flags = typeof flags === 'string' ? FS.modeStringToFlags(flags) : flags;
        mode = typeof mode === 'undefined' ? 438 /* 0666 */ : mode;
        if ((flags & 64)) {
          mode = (mode & 4095) | 32768;
        } else {
          mode = 0;
        }
        var node;
        if (typeof path === 'object') {
          node = path;
        } else {
          path = PATH.normalize(path);
          try {
            var lookup = FS.lookupPath(path, {
              follow: !(flags & 131072)
            });
            node = lookup.node;
          } catch (e) {
            // ignore
          }
        }
        // perhaps we need to create the node
        var created = false;
        if ((flags & 64)) {
          if (node) {
            // if O_CREAT and O_EXCL are set, error out if the node already exists
            if ((flags & 128)) {
              throw new FS.ErrnoError(ERRNO_CODES.EEXIST);
            }
          } else {
            // node doesn't exist, try to create it
            node = FS.mknod(path, mode, 0);
            created = true;
          }
        }
        if (!node) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        // can't truncate a device
        if (FS.isChrdev(node.mode)) {
          flags &= ~512;
        }
        // check permissions, if this is not a file we just created now (it is ok to
        // create and write to a file with read-only permissions; it is read-only
        // for later use)
        if (!created) {
          var err = FS.mayOpen(node, flags);
          if (err) {
            throw new FS.ErrnoError(err);
          }
        }
        // do truncation if necessary
        if ((flags & 512)) {
          FS.truncate(node, 0);
        }
        // we've already handled these, don't pass down to the underlying vfs
        flags &= ~(128 | 512);
  
        // register the stream with the filesystem
        var stream = FS.createStream({
          node: node,
          path: FS.getPath(node),  // we want the absolute path to the node
          flags: flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          // used by the file family libc calls (fopen, fwrite, ferror, etc.)
          ungotten: [],
          error: false
        }, fd_start, fd_end);
        // call the new stream's open function
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream);
        }
        if (Module['logReadFiles'] && !(flags & 1)) {
          if (!FS.readFiles) FS.readFiles = {};
          if (!(path in FS.readFiles)) {
            FS.readFiles[path] = 1;
            Module['printErr']('read file: ' + path);
          }
        }
        try {
          if (FS.trackingDelegate['onOpenFile']) {
            var trackingFlags = 0;
            if ((flags & 2097155) !== 1) {
              trackingFlags |= FS.tracking.openFlags.READ;
            }
            if ((flags & 2097155) !== 0) {
              trackingFlags |= FS.tracking.openFlags.WRITE;
            }
            FS.trackingDelegate['onOpenFile'](path, trackingFlags);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['onOpenFile']('"+path+"', flags) threw an exception: " + e.message);
        }
        return stream;
      },close:function (stream) {
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
      },llseek:function (stream, offset, whence) {
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        stream.position = stream.stream_ops.llseek(stream, offset, whence);
        stream.ungotten = [];
        return stream.position;
      },read:function (stream, buffer, offset, length, position) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },write:function (stream, buffer, offset, length, position, canOwn) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if (stream.flags & 1024) {
          // seek to the end before writing in append mode
          FS.llseek(stream, 0, 2);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        try {
          if (stream.path && FS.trackingDelegate['onWriteToFile']) FS.trackingDelegate['onWriteToFile'](stream.path);
        } catch(e) {
          console.log("FS.trackingDelegate['onWriteToFile']('"+path+"') threw an exception: " + e.message);
        }
        return bytesWritten;
      },allocate:function (stream, offset, length) {
        if (offset < 0 || length <= 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        if (!stream.stream_ops.allocate) {
          throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
        }
        stream.stream_ops.allocate(stream, offset, length);
      },mmap:function (stream, buffer, offset, length, position, prot, flags) {
        // TODO if PROT is PROT_WRITE, make sure we have write access
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EACCES);
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags);
      },ioctl:function (stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTTY);
        }
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },readFile:function (path, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'r';
        opts.encoding = opts.encoding || 'binary';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === 'utf8') {
          ret = '';
          var utf8 = new Runtime.UTF8Processor();
          for (var i = 0; i < length; i++) {
            ret += utf8.processCChar(buf[i]);
          }
        } else if (opts.encoding === 'binary') {
          ret = buf;
        }
        FS.close(stream);
        return ret;
      },writeFile:function (path, data, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'w';
        opts.encoding = opts.encoding || 'utf8';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        var stream = FS.open(path, opts.flags, opts.mode);
        if (opts.encoding === 'utf8') {
          var utf8 = new Runtime.UTF8Processor();
          var buf = new Uint8Array(utf8.processJSString(data));
          FS.write(stream, buf, 0, buf.length, 0, opts.canOwn);
        } else if (opts.encoding === 'binary') {
          FS.write(stream, data, 0, data.length, 0, opts.canOwn);
        }
        FS.close(stream);
      },cwd:function () {
        return FS.currentPath;
      },chdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        var err = FS.nodePermissions(lookup.node, 'x');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        FS.currentPath = lookup.path;
      },createDefaultDirectories:function () {
        FS.mkdir('/tmp');
        FS.mkdir('/home');
        FS.mkdir('/home/web_user');
      },createDefaultDevices:function () {
        // create /dev
        FS.mkdir('/dev');
        // setup /dev/null
        FS.registerDevice(FS.makedev(1, 3), {
          read: function() { return 0; },
          write: function() { return 0; }
        });
        FS.mkdev('/dev/null', FS.makedev(1, 3));
        // setup /dev/tty and /dev/tty1
        // stderr needs to print output using Module['printErr']
        // so we register a second tty just for it.
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev('/dev/tty', FS.makedev(5, 0));
        FS.mkdev('/dev/tty1', FS.makedev(6, 0));
        // setup /dev/[u]random
        var random_device;
        if (typeof crypto !== 'undefined') {
          // for modern web browsers
          var randomBuffer = new Uint8Array(1);
          random_device = function() { crypto.getRandomValues(randomBuffer); return randomBuffer[0]; };
        } else if (ENVIRONMENT_IS_NODE) {
          // for nodejs
          random_device = function() { return require('crypto').randomBytes(1)[0]; };
        } else {
          // default for ES5 platforms
          random_device = function() { return (Math.random()*256)|0; };
        }
        FS.createDevice('/dev', 'random', random_device);
        FS.createDevice('/dev', 'urandom', random_device);
        // we're not going to emulate the actual shm device,
        // just create the tmp dirs that reside in it commonly
        FS.mkdir('/dev/shm');
        FS.mkdir('/dev/shm/tmp');
      },createStandardStreams:function () {
        // TODO deprecate the old functionality of a single
        // input / output callback and that utilizes FS.createDevice
        // and instead require a unique set of stream ops
  
        // by default, we symlink the standard streams to the
        // default tty devices. however, if the standard streams
        // have been overwritten we create a unique device for
        // them instead.
        if (Module['stdin']) {
          FS.createDevice('/dev', 'stdin', Module['stdin']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdin');
        }
        if (Module['stdout']) {
          FS.createDevice('/dev', 'stdout', null, Module['stdout']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdout');
        }
        if (Module['stderr']) {
          FS.createDevice('/dev', 'stderr', null, Module['stderr']);
        } else {
          FS.symlink('/dev/tty1', '/dev/stderr');
        }
  
        // open default streams for the stdin, stdout and stderr devices
        var stdin = FS.open('/dev/stdin', 'r');
        HEAP32[((_stdin)>>2)]=FS.getPtrForStream(stdin);
        assert(stdin.fd === 0, 'invalid handle for stdin (' + stdin.fd + ')');
  
        var stdout = FS.open('/dev/stdout', 'w');
        HEAP32[((_stdout)>>2)]=FS.getPtrForStream(stdout);
        assert(stdout.fd === 1, 'invalid handle for stdout (' + stdout.fd + ')');
  
        var stderr = FS.open('/dev/stderr', 'w');
        HEAP32[((_stderr)>>2)]=FS.getPtrForStream(stderr);
        assert(stderr.fd === 2, 'invalid handle for stderr (' + stderr.fd + ')');
      },ensureErrnoError:function () {
        if (FS.ErrnoError) return;
        FS.ErrnoError = function ErrnoError(errno, node) {
          this.node = node;
          this.setErrno = function(errno) {
            this.errno = errno;
            for (var key in ERRNO_CODES) {
              if (ERRNO_CODES[key] === errno) {
                this.code = key;
                break;
              }
            }
          };
          this.setErrno(errno);
          this.message = ERRNO_MESSAGES[errno];
          if (this.stack) this.stack = demangleAll(this.stack);
        };
        FS.ErrnoError.prototype = new Error();
        FS.ErrnoError.prototype.constructor = FS.ErrnoError;
        // Some errors may happen quite a bit, to avoid overhead we reuse them (and suffer a lack of stack info)
        [ERRNO_CODES.ENOENT].forEach(function(code) {
          FS.genericErrors[code] = new FS.ErrnoError(code);
          FS.genericErrors[code].stack = '<generic error, no stack>';
        });
      },staticInit:function () {
        FS.ensureErrnoError();
  
        FS.nameTable = new Array(4096);
  
        FS.mount(MEMFS, {}, '/');
  
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
      },init:function (input, output, error) {
        assert(!FS.init.initialized, 'FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
        FS.init.initialized = true;
  
        FS.ensureErrnoError();
  
        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        Module['stdin'] = input || Module['stdin'];
        Module['stdout'] = output || Module['stdout'];
        Module['stderr'] = error || Module['stderr'];
  
        FS.createStandardStreams();
      },quit:function () {
        FS.init.initialized = false;
        for (var i = 0; i < FS.streams.length; i++) {
          var stream = FS.streams[i];
          if (!stream) {
            continue;
          }
          FS.close(stream);
        }
      },getMode:function (canRead, canWrite) {
        var mode = 0;
        if (canRead) mode |= 292 | 73;
        if (canWrite) mode |= 146;
        return mode;
      },joinPath:function (parts, forceRelative) {
        var path = PATH.join.apply(null, parts);
        if (forceRelative && path[0] == '/') path = path.substr(1);
        return path;
      },absolutePath:function (relative, base) {
        return PATH.resolve(base, relative);
      },standardizePath:function (path) {
        return PATH.normalize(path);
      },findObject:function (path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (ret.exists) {
          return ret.object;
        } else {
          ___setErrNo(ret.error);
          return null;
        }
      },analyzePath:function (path, dontResolveLastLink) {
        // operate from within the context of the symlink's target
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {
        }
        var ret = {
          isRoot: false, exists: false, error: 0, name: null, path: null, object: null,
          parentExists: false, parentPath: null, parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === '/';
        } catch (e) {
          ret.error = e.errno;
        };
        return ret;
      },createFolder:function (parent, name, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.mkdir(path, mode);
      },createPath:function (parent, path, canRead, canWrite) {
        parent = typeof parent === 'string' ? parent : FS.getPath(parent);
        var parts = path.split('/').reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join2(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {
            // ignore EEXIST
          }
          parent = current;
        }
        return current;
      },createFile:function (parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.create(path, mode);
      },createDataFile:function (parent, name, data, canRead, canWrite, canOwn) {
        var path = name ? PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name) : parent;
        var mode = FS.getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          if (typeof data === 'string') {
            var arr = new Array(data.length);
            for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
            data = arr;
          }
          // make sure we can write to the file
          FS.chmod(node, mode | 146);
          var stream = FS.open(node, 'w');
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(node, mode);
        }
        return node;
      },createDevice:function (parent, name, input, output) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(!!input, !!output);
        if (!FS.createDevice.major) FS.createDevice.major = 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        // Create a fake device that a set of stream ops to emulate
        // the old behavior.
        FS.registerDevice(dev, {
          open: function(stream) {
            stream.seekable = false;
          },
          close: function(stream) {
            // flush any pending line data
            if (output && output.buffer && output.buffer.length) {
              output(10);
            }
          },
          read: function(stream, buffer, offset, length, pos /* ignored */) {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
              if (result === undefined && bytesRead === 0) {
                throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              buffer[offset+i] = result;
            }
            if (bytesRead) {
              stream.node.timestamp = Date.now();
            }
            return bytesRead;
          },
          write: function(stream, buffer, offset, length, pos) {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset+i]);
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
            }
            if (length) {
              stream.node.timestamp = Date.now();
            }
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },createLink:function (parent, name, target, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        return FS.symlink(target, path);
      },forceLoadFile:function (obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        var success = true;
        if (typeof XMLHttpRequest !== 'undefined') {
          throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
        } else if (Module['read']) {
          // Command-line.
          try {
            // WARNING: Can't read binary files in V8's d8 or tracemonkey's js, as
            //          read() will try to parse UTF8.
            obj.contents = intArrayFromString(Module['read'](obj.url), true);
            obj.usedBytes = obj.contents.length;
          } catch (e) {
            success = false;
          }
        } else {
          throw new Error('Cannot load without read() or XMLHttpRequest.');
        }
        if (!success) ___setErrNo(ERRNO_CODES.EIO);
        return success;
      },createLazyFile:function (parent, name, url, canRead, canWrite) {
        // Lazy chunked Uint8Array (implements get and length from Uint8Array). Actual getting is abstracted away for eventual reuse.
        function LazyUint8Array() {
          this.lengthKnown = false;
          this.chunks = []; // Loaded chunks. Index is the chunk number
        }
        LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
          if (idx > this.length-1 || idx < 0) {
            return undefined;
          }
          var chunkOffset = idx % this.chunkSize;
          var chunkNum = (idx / this.chunkSize)|0;
          return this.getter(chunkNum)[chunkOffset];
        }
        LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
          this.getter = getter;
        }
        LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
          // Find length
          var xhr = new XMLHttpRequest();
          xhr.open('HEAD', url, false);
          xhr.send(null);
          if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
          var datalength = Number(xhr.getResponseHeader("Content-length"));
          var header;
          var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
          var chunkSize = 1024*1024; // Chunk size in bytes
  
          if (!hasByteServing) chunkSize = datalength;
  
          // Function to get a range from the remote URL.
          var doXHR = (function(from, to) {
            if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
            if (to > datalength-1) throw new Error("only " + datalength + " bytes available! programmer error!");
  
            // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, false);
            if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
  
            // Some hints to the browser that we want binary data.
            if (typeof Uint8Array != 'undefined') xhr.responseType = 'arraybuffer';
            if (xhr.overrideMimeType) {
              xhr.overrideMimeType('text/plain; charset=x-user-defined');
            }
  
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
            if (xhr.response !== undefined) {
              return new Uint8Array(xhr.response || []);
            } else {
              return intArrayFromString(xhr.responseText || '', true);
            }
          });
          var lazyArray = this;
          lazyArray.setDataGetter(function(chunkNum) {
            var start = chunkNum * chunkSize;
            var end = (chunkNum+1) * chunkSize - 1; // including this byte
            end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
            if (typeof(lazyArray.chunks[chunkNum]) === "undefined") {
              lazyArray.chunks[chunkNum] = doXHR(start, end);
            }
            if (typeof(lazyArray.chunks[chunkNum]) === "undefined") throw new Error("doXHR failed!");
            return lazyArray.chunks[chunkNum];
          });
  
          this._length = datalength;
          this._chunkSize = chunkSize;
          this.lengthKnown = true;
        }
        if (typeof XMLHttpRequest !== 'undefined') {
          if (!ENVIRONMENT_IS_WORKER) throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc';
          var lazyArray = new LazyUint8Array();
          Object.defineProperty(lazyArray, "length", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._length;
              }
          });
          Object.defineProperty(lazyArray, "chunkSize", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._chunkSize;
              }
          });
  
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
  
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        // This is a total hack, but I want to get this lazy file code out of the
        // core of MEMFS. If we want to keep this lazy file concept I feel it should
        // be its own thin LAZYFS proxying calls to MEMFS.
        if (properties.contents) {
          node.contents = properties.contents;
        } else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        // Add a function that defers querying the file size until it is asked the first time.
        Object.defineProperty(node, "usedBytes", {
            get: function() { return this.contents.length; }
        });
        // override each stream op with one that tries to force load the lazy file first
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach(function(key) {
          var fn = node.stream_ops[key];
          stream_ops[key] = function forceLoadLazyFile() {
            if (!FS.forceLoadFile(node)) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            return fn.apply(null, arguments);
          };
        });
        // use a custom read function
        stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
          if (!FS.forceLoadFile(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EIO);
          }
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (contents.slice) { // normal array
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          } else {
            for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
              buffer[offset + i] = contents.get(position + i);
            }
          }
          return size;
        };
        node.stream_ops = stream_ops;
        return node;
      },createPreloadedFile:function (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn) {
        Browser.init();
        // TODO we should allow people to just pass in a complete filename instead
        // of parent and name being that we just join them anyways
        var fullname = name ? PATH.resolve(PATH.join2(parent, name)) : parent;
        function processData(byteArray) {
          function finish(byteArray) {
            if (!dontCreateFile) {
              FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
            }
            if (onload) onload();
            removeRunDependency('cp ' + fullname);
          }
          var handled = false;
          Module['preloadPlugins'].forEach(function(plugin) {
            if (handled) return;
            if (plugin['canHandle'](fullname)) {
              plugin['handle'](byteArray, fullname, finish, function() {
                if (onerror) onerror();
                removeRunDependency('cp ' + fullname);
              });
              handled = true;
            }
          });
          if (!handled) finish(byteArray);
        }
        addRunDependency('cp ' + fullname);
        if (typeof url == 'string') {
          Browser.asyncLoad(url, function(byteArray) {
            processData(byteArray);
          }, onerror);
        } else {
          processData(url);
        }
      },indexedDB:function () {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      },DB_NAME:function () {
        return 'EM_FS_' + window.location.pathname;
      },DB_VERSION:20,DB_STORE_NAME:"FILE_DATA",saveFilesToDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
          console.log('creating db');
          var db = openRequest.result;
          db.createObjectStore(FS.DB_STORE_NAME);
        };
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          var transaction = db.transaction([FS.DB_STORE_NAME], 'readwrite');
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var putRequest = files.put(FS.analyzePath(path).object.contents, path);
            putRequest.onsuccess = function putRequest_onsuccess() { ok++; if (ok + fail == total) finish() };
            putRequest.onerror = function putRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      },loadFilesFromDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = onerror; // no database to load from
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          try {
            var transaction = db.transaction([FS.DB_STORE_NAME], 'readonly');
          } catch(e) {
            onerror(e);
            return;
          }
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var getRequest = files.get(path);
            getRequest.onsuccess = function getRequest_onsuccess() {
              if (FS.analyzePath(path).exists) {
                FS.unlink(path);
              }
              FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
              ok++;
              if (ok + fail == total) finish();
            };
            getRequest.onerror = function getRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      }};var PATH={splitPath:function (filename) {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },normalizeArray:function (parts, allowAboveRoot) {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up--; up) {
            parts.unshift('..');
          }
        }
        return parts;
      },normalize:function (path) {
        var isAbsolute = path.charAt(0) === '/',
            trailingSlash = path.substr(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },dirname:function (path) {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
          // No dirname whatsoever
          return '.';
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.substr(0, dir.length - 1);
        }
        return root + dir;
      },basename:function (path) {
        // EMSCRIPTEN return '/'' for '/', not an empty string
        if (path === '/') return '/';
        var lastSlash = path.lastIndexOf('/');
        if (lastSlash === -1) return path;
        return path.substr(lastSlash+1);
      },extname:function (path) {
        return PATH.splitPath(path)[3];
      },join:function () {
        var paths = Array.prototype.slice.call(arguments, 0);
        return PATH.normalize(paths.join('/'));
      },join2:function (l, r) {
        return PATH.normalize(l + '/' + r);
      },resolve:function () {
        var resolvedPath = '',
          resolvedAbsolute = false;
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path = (i >= 0) ? arguments[i] : FS.cwd();
          // Skip empty and invalid entries
          if (typeof path !== 'string') {
            throw new TypeError('Arguments to path.resolve must be strings');
          } else if (!path) {
            return ''; // an invalid portion invalidates the whole thing
          }
          resolvedPath = path + '/' + resolvedPath;
          resolvedAbsolute = path.charAt(0) === '/';
        }
        // At this point the path should be resolved to a full absolute path, but
        // handle relative paths to be safe (might happen when process.cwd() fails)
        resolvedPath = PATH.normalizeArray(resolvedPath.split('/').filter(function(p) {
          return !!p;
        }), !resolvedAbsolute).join('/');
        return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
      },relative:function (from, to) {
        from = PATH.resolve(from).substr(1);
        to = PATH.resolve(to).substr(1);
        function trim(arr) {
          var start = 0;
          for (; start < arr.length; start++) {
            if (arr[start] !== '') break;
          }
          var end = arr.length - 1;
          for (; end >= 0; end--) {
            if (arr[end] !== '') break;
          }
          if (start > end) return [];
          return arr.slice(start, end - start + 1);
        }
        var fromParts = trim(from.split('/'));
        var toParts = trim(to.split('/'));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
          if (fromParts[i] !== toParts[i]) {
            samePartsLength = i;
            break;
          }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
          outputParts.push('..');
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join('/');
      }};
  
  
  function _emscripten_set_main_loop_timing(mode, value) {
      Browser.mainLoop.timingMode = mode;
      Browser.mainLoop.timingValue = value;
  
      if (!Browser.mainLoop.func) {
        console.error('emscripten_set_main_loop_timing: Cannot set timing mode for main loop since a main loop does not exist! Call emscripten_set_main_loop first to set one up.');
        return 1; // Return non-zero on failure, can't set timing mode when there is no main loop.
      }
  
      if (mode == 0 /*EM_TIMING_SETTIMEOUT*/) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler() {
          setTimeout(Browser.mainLoop.runner, value); // doing this each time means that on exception, we stop
        };
        Browser.mainLoop.method = 'timeout';
      } else if (mode == 1 /*EM_TIMING_RAF*/) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler() {
          Browser.requestAnimationFrame(Browser.mainLoop.runner);
        };
        Browser.mainLoop.method = 'rAF';
      }
      return 0;
    }function _emscripten_set_main_loop(func, fps, simulateInfiniteLoop, arg) {
      Module['noExitRuntime'] = true;
  
      assert(!Browser.mainLoop.func, 'emscripten_set_main_loop: there can only be one main loop function at once: call emscripten_cancel_main_loop to cancel the previous one before setting a new one with different parameters.');
  
      Browser.mainLoop.func = func;
      Browser.mainLoop.arg = arg;
  
      var thisMainLoopId = Browser.mainLoop.currentlyRunningMainloop;
  
      Browser.mainLoop.runner = function Browser_mainLoop_runner() {
        if (ABORT) return;
        if (Browser.mainLoop.queue.length > 0) {
          var start = Date.now();
          var blocker = Browser.mainLoop.queue.shift();
          blocker.func(blocker.arg);
          if (Browser.mainLoop.remainingBlockers) {
            var remaining = Browser.mainLoop.remainingBlockers;
            var next = remaining%1 == 0 ? remaining-1 : Math.floor(remaining);
            if (blocker.counted) {
              Browser.mainLoop.remainingBlockers = next;
            } else {
              // not counted, but move the progress along a tiny bit
              next = next + 0.5; // do not steal all the next one's progress
              Browser.mainLoop.remainingBlockers = (8*remaining + next)/9;
            }
          }
          console.log('main loop blocker "' + blocker.name + '" took ' + (Date.now() - start) + ' ms'); //, left: ' + Browser.mainLoop.remainingBlockers);
          Browser.mainLoop.updateStatus();
          setTimeout(Browser.mainLoop.runner, 0);
          return;
        }
  
        // catch pauses from non-main loop sources
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  
        // Implement very basic swap interval control
        Browser.mainLoop.currentFrameNumber = Browser.mainLoop.currentFrameNumber + 1 | 0;
        if (Browser.mainLoop.timingMode == 1/*EM_TIMING_RAF*/ && Browser.mainLoop.timingValue > 1 && Browser.mainLoop.currentFrameNumber % Browser.mainLoop.timingValue != 0) {
          // Not the scheduled time to render this frame - skip.
          Browser.mainLoop.scheduler();
          return;
        }
  
        // Signal GL rendering layer that processing of a new frame is about to start. This helps it optimize
        // VBO double-buffering and reduce GPU stalls.
  
        if (Browser.mainLoop.method === 'timeout' && Module.ctx) {
          Module.printErr('Looks like you are rendering without using requestAnimationFrame for the main loop. You should use 0 for the frame rate in emscripten_set_main_loop in order to use requestAnimationFrame, as that can greatly improve your frame rates!');
          Browser.mainLoop.method = ''; // just warn once per call to set main loop
        }
  
        Browser.mainLoop.runIter(function() {
          if (typeof arg !== 'undefined') {
            Runtime.dynCall('vi', func, [arg]);
          } else {
            Runtime.dynCall('v', func);
          }
        });
  
        // catch pauses from the main loop itself
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  
        // Queue new audio data. This is important to be right after the main loop invocation, so that we will immediately be able
        // to queue the newest produced audio samples.
        // TODO: Consider adding pre- and post- rAF callbacks so that GL.newRenderingFrameStarted() and SDL.audio.queueNewAudioData()
        //       do not need to be hardcoded into this function, but can be more generic.
        if (typeof SDL === 'object' && SDL.audio && SDL.audio.queueNewAudioData) SDL.audio.queueNewAudioData();
  
        Browser.mainLoop.scheduler();
      }
  
      if (fps && fps > 0) _emscripten_set_main_loop_timing(0/*EM_TIMING_SETTIMEOUT*/, 1000.0 / fps);
      else _emscripten_set_main_loop_timing(1/*EM_TIMING_RAF*/, 1); // Do rAF by rendering each frame (no decimating)
  
      Browser.mainLoop.scheduler();
  
      if (simulateInfiniteLoop) {
        throw 'SimulateInfiniteLoop';
      }
    }var Browser={mainLoop:{scheduler:null,method:"",currentlyRunningMainloop:0,func:null,arg:0,timingMode:0,timingValue:0,currentFrameNumber:0,queue:[],pause:function () {
          Browser.mainLoop.scheduler = null;
          Browser.mainLoop.currentlyRunningMainloop++; // Incrementing this signals the previous main loop that it's now become old, and it must return.
        },resume:function () {
          Browser.mainLoop.currentlyRunningMainloop++;
          var timingMode = Browser.mainLoop.timingMode;
          var timingValue = Browser.mainLoop.timingValue;
          var func = Browser.mainLoop.func;
          Browser.mainLoop.func = null;
          _emscripten_set_main_loop(func, 0, false, Browser.mainLoop.arg);
          _emscripten_set_main_loop_timing(timingMode, timingValue);
        },updateStatus:function () {
          if (Module['setStatus']) {
            var message = Module['statusMessage'] || 'Please wait...';
            var remaining = Browser.mainLoop.remainingBlockers;
            var expected = Browser.mainLoop.expectedBlockers;
            if (remaining) {
              if (remaining < expected) {
                Module['setStatus'](message + ' (' + (expected - remaining) + '/' + expected + ')');
              } else {
                Module['setStatus'](message);
              }
            } else {
              Module['setStatus']('');
            }
          }
        },runIter:function (func) {
          if (ABORT) return;
          if (Module['preMainLoop']) {
            var preRet = Module['preMainLoop']();
            if (preRet === false) {
              return; // |return false| skips a frame
            }
          }
          try {
            func();
          } catch (e) {
            if (e instanceof ExitStatus) {
              return;
            } else {
              if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
              throw e;
            }
          }
          if (Module['postMainLoop']) Module['postMainLoop']();
        }},isFullScreen:false,pointerLock:false,moduleContextCreatedCallbacks:[],workers:[],init:function () {
        if (!Module["preloadPlugins"]) Module["preloadPlugins"] = []; // needs to exist even in workers
  
        if (Browser.initted) return;
        Browser.initted = true;
  
        try {
          new Blob();
          Browser.hasBlobConstructor = true;
        } catch(e) {
          Browser.hasBlobConstructor = false;
          console.log("warning: no blob constructor, cannot create blobs with mimetypes");
        }
        Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : (typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : (!Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null));
        Browser.URLObject = typeof window != "undefined" ? (window.URL ? window.URL : window.webkitURL) : undefined;
        if (!Module.noImageDecoding && typeof Browser.URLObject === 'undefined') {
          console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
          Module.noImageDecoding = true;
        }
  
        // Support for plugins that can process preloaded files. You can add more of these to
        // your app by creating and appending to Module.preloadPlugins.
        //
        // Each plugin is asked if it can handle a file based on the file's name. If it can,
        // it is given the file's raw data. When it is done, it calls a callback with the file's
        // (possibly modified) data. For example, a plugin might decompress a file, or it
        // might create some side data structure for use later (like an Image element, etc.).
  
        var imagePlugin = {};
        imagePlugin['canHandle'] = function imagePlugin_canHandle(name) {
          return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name);
        };
        imagePlugin['handle'] = function imagePlugin_handle(byteArray, name, onload, onerror) {
          var b = null;
          if (Browser.hasBlobConstructor) {
            try {
              b = new Blob([byteArray], { type: Browser.getMimetype(name) });
              if (b.size !== byteArray.length) { // Safari bug #118630
                // Safari's Blob can only take an ArrayBuffer
                b = new Blob([(new Uint8Array(byteArray)).buffer], { type: Browser.getMimetype(name) });
              }
            } catch(e) {
              Runtime.warnOnce('Blob constructor present but fails: ' + e + '; falling back to blob builder');
            }
          }
          if (!b) {
            var bb = new Browser.BlobBuilder();
            bb.append((new Uint8Array(byteArray)).buffer); // we need to pass a buffer, and must copy the array to get the right data range
            b = bb.getBlob();
          }
          var url = Browser.URLObject.createObjectURL(b);
          assert(typeof url == 'string', 'createObjectURL must return a url as a string');
          var img = new Image();
          img.onload = function img_onload() {
            assert(img.complete, 'Image ' + name + ' could not be decoded');
            var canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            Module["preloadedImages"][name] = canvas;
            Browser.URLObject.revokeObjectURL(url);
            if (onload) onload(byteArray);
          };
          img.onerror = function img_onerror(event) {
            console.log('Image ' + url + ' could not be decoded');
            if (onerror) onerror();
          };
          img.src = url;
        };
        Module['preloadPlugins'].push(imagePlugin);
  
        var audioPlugin = {};
        audioPlugin['canHandle'] = function audioPlugin_canHandle(name) {
          return !Module.noAudioDecoding && name.substr(-4) in { '.ogg': 1, '.wav': 1, '.mp3': 1 };
        };
        audioPlugin['handle'] = function audioPlugin_handle(byteArray, name, onload, onerror) {
          var done = false;
          function finish(audio) {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = audio;
            if (onload) onload(byteArray);
          }
          function fail() {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = new Audio(); // empty shim
            if (onerror) onerror();
          }
          if (Browser.hasBlobConstructor) {
            try {
              var b = new Blob([byteArray], { type: Browser.getMimetype(name) });
            } catch(e) {
              return fail();
            }
            var url = Browser.URLObject.createObjectURL(b); // XXX we never revoke this!
            assert(typeof url == 'string', 'createObjectURL must return a url as a string');
            var audio = new Audio();
            audio.addEventListener('canplaythrough', function() { finish(audio) }, false); // use addEventListener due to chromium bug 124926
            audio.onerror = function audio_onerror(event) {
              if (done) return;
              console.log('warning: browser could not fully decode audio ' + name + ', trying slower base64 approach');
              function encode64(data) {
                var BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                var PAD = '=';
                var ret = '';
                var leftchar = 0;
                var leftbits = 0;
                for (var i = 0; i < data.length; i++) {
                  leftchar = (leftchar << 8) | data[i];
                  leftbits += 8;
                  while (leftbits >= 6) {
                    var curr = (leftchar >> (leftbits-6)) & 0x3f;
                    leftbits -= 6;
                    ret += BASE[curr];
                  }
                }
                if (leftbits == 2) {
                  ret += BASE[(leftchar&3) << 4];
                  ret += PAD + PAD;
                } else if (leftbits == 4) {
                  ret += BASE[(leftchar&0xf) << 2];
                  ret += PAD;
                }
                return ret;
              }
              audio.src = 'data:audio/x-' + name.substr(-3) + ';base64,' + encode64(byteArray);
              finish(audio); // we don't wait for confirmation this worked - but it's worth trying
            };
            audio.src = url;
            // workaround for chrome bug 124926 - we do not always get oncanplaythrough or onerror
            Browser.safeSetTimeout(function() {
              finish(audio); // try to use it even though it is not necessarily ready to play
            }, 10000);
          } else {
            return fail();
          }
        };
        Module['preloadPlugins'].push(audioPlugin);
  
        // Canvas event setup
  
        var canvas = Module['canvas'];
        function pointerLockChange() {
          Browser.pointerLock = document['pointerLockElement'] === canvas ||
                                document['mozPointerLockElement'] === canvas ||
                                document['webkitPointerLockElement'] === canvas ||
                                document['msPointerLockElement'] === canvas;
        }
        if (canvas) {
          // forced aspect ratio can be enabled by defining 'forcedAspectRatio' on Module
          // Module['forcedAspectRatio'] = 4 / 3;
          
          canvas.requestPointerLock = canvas['requestPointerLock'] ||
                                      canvas['mozRequestPointerLock'] ||
                                      canvas['webkitRequestPointerLock'] ||
                                      canvas['msRequestPointerLock'] ||
                                      function(){};
          canvas.exitPointerLock = document['exitPointerLock'] ||
                                   document['mozExitPointerLock'] ||
                                   document['webkitExitPointerLock'] ||
                                   document['msExitPointerLock'] ||
                                   function(){}; // no-op if function does not exist
          canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
  
  
          document.addEventListener('pointerlockchange', pointerLockChange, false);
          document.addEventListener('mozpointerlockchange', pointerLockChange, false);
          document.addEventListener('webkitpointerlockchange', pointerLockChange, false);
          document.addEventListener('mspointerlockchange', pointerLockChange, false);
  
          if (Module['elementPointerLock']) {
            canvas.addEventListener("click", function(ev) {
              if (!Browser.pointerLock && canvas.requestPointerLock) {
                canvas.requestPointerLock();
                ev.preventDefault();
              }
            }, false);
          }
        }
      },createContext:function (canvas, useWebGL, setInModule, webGLContextAttributes) {
        if (useWebGL && Module.ctx && canvas == Module.canvas) return Module.ctx; // no need to recreate GL context if it's already been created for this canvas.
  
        var ctx;
        var contextHandle;
        if (useWebGL) {
          // For GLES2/desktop GL compatibility, adjust a few defaults to be different to WebGL defaults, so that they align better with the desktop defaults.
          var contextAttributes = {
            antialias: false,
            alpha: false
          };
  
          if (webGLContextAttributes) {
            for (var attribute in webGLContextAttributes) {
              contextAttributes[attribute] = webGLContextAttributes[attribute];
            }
          }
  
          contextHandle = GL.createContext(canvas, contextAttributes);
          if (contextHandle) {
            ctx = GL.getContext(contextHandle).GLctx;
          }
          // Set the background of the WebGL canvas to black
          canvas.style.backgroundColor = "black";
        } else {
          ctx = canvas.getContext('2d');
        }
  
        if (!ctx) return null;
  
        if (setInModule) {
          if (!useWebGL) assert(typeof GLctx === 'undefined', 'cannot set in module if GLctx is used, but we are a non-GL context that would replace it');
  
          Module.ctx = ctx;
          if (useWebGL) GL.makeContextCurrent(contextHandle);
          Module.useWebGL = useWebGL;
          Browser.moduleContextCreatedCallbacks.forEach(function(callback) { callback() });
          Browser.init();
        }
        return ctx;
      },destroyContext:function (canvas, useWebGL, setInModule) {},fullScreenHandlersInstalled:false,lockPointer:undefined,resizeCanvas:undefined,requestFullScreen:function (lockPointer, resizeCanvas) {
        Browser.lockPointer = lockPointer;
        Browser.resizeCanvas = resizeCanvas;
        if (typeof Browser.lockPointer === 'undefined') Browser.lockPointer = true;
        if (typeof Browser.resizeCanvas === 'undefined') Browser.resizeCanvas = false;
  
        var canvas = Module['canvas'];
        function fullScreenChange() {
          Browser.isFullScreen = false;
          var canvasContainer = canvas.parentNode;
          if ((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
               document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
               document['fullScreenElement'] || document['fullscreenElement'] ||
               document['msFullScreenElement'] || document['msFullscreenElement'] ||
               document['webkitCurrentFullScreenElement']) === canvasContainer) {
            canvas.cancelFullScreen = document['cancelFullScreen'] ||
                                      document['mozCancelFullScreen'] ||
                                      document['webkitCancelFullScreen'] ||
                                      document['msExitFullscreen'] ||
                                      document['exitFullscreen'] ||
                                      function() {};
            canvas.cancelFullScreen = canvas.cancelFullScreen.bind(document);
            if (Browser.lockPointer) canvas.requestPointerLock();
            Browser.isFullScreen = true;
            if (Browser.resizeCanvas) Browser.setFullScreenCanvasSize();
          } else {
            
            // remove the full screen specific parent of the canvas again to restore the HTML structure from before going full screen
            canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
            canvasContainer.parentNode.removeChild(canvasContainer);
            
            if (Browser.resizeCanvas) Browser.setWindowedCanvasSize();
          }
          if (Module['onFullScreen']) Module['onFullScreen'](Browser.isFullScreen);
          Browser.updateCanvasDimensions(canvas);
        }
  
        if (!Browser.fullScreenHandlersInstalled) {
          Browser.fullScreenHandlersInstalled = true;
          document.addEventListener('fullscreenchange', fullScreenChange, false);
          document.addEventListener('mozfullscreenchange', fullScreenChange, false);
          document.addEventListener('webkitfullscreenchange', fullScreenChange, false);
          document.addEventListener('MSFullscreenChange', fullScreenChange, false);
        }
  
        // create a new parent to ensure the canvas has no siblings. this allows browsers to optimize full screen performance when its parent is the full screen root
        var canvasContainer = document.createElement("div");
        canvas.parentNode.insertBefore(canvasContainer, canvas);
        canvasContainer.appendChild(canvas);
        
        // use parent of canvas as full screen root to allow aspect ratio correction (Firefox stretches the root to screen size)
        canvasContainer.requestFullScreen = canvasContainer['requestFullScreen'] ||
                                            canvasContainer['mozRequestFullScreen'] ||
                                            canvasContainer['msRequestFullscreen'] ||
                                           (canvasContainer['webkitRequestFullScreen'] ? function() { canvasContainer['webkitRequestFullScreen'](Element['ALLOW_KEYBOARD_INPUT']) } : null);
        canvasContainer.requestFullScreen();
      },nextRAF:0,fakeRequestAnimationFrame:function (func) {
        // try to keep 60fps between calls to here
        var now = Date.now();
        if (Browser.nextRAF === 0) {
          Browser.nextRAF = now + 1000/60;
        } else {
          while (now + 2 >= Browser.nextRAF) { // fudge a little, to avoid timer jitter causing us to do lots of delay:0
            Browser.nextRAF += 1000/60;
          }
        }
        var delay = Math.max(Browser.nextRAF - now, 0);
        setTimeout(func, delay);
      },requestAnimationFrame:function requestAnimationFrame(func) {
        if (typeof window === 'undefined') { // Provide fallback to setTimeout if window is undefined (e.g. in Node.js)
          Browser.fakeRequestAnimationFrame(func);
        } else {
          if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = window['requestAnimationFrame'] ||
                                           window['mozRequestAnimationFrame'] ||
                                           window['webkitRequestAnimationFrame'] ||
                                           window['msRequestAnimationFrame'] ||
                                           window['oRequestAnimationFrame'] ||
                                           Browser.fakeRequestAnimationFrame;
          }
          window.requestAnimationFrame(func);
        }
      },safeCallback:function (func) {
        return function() {
          if (!ABORT) return func.apply(null, arguments);
        };
      },safeRequestAnimationFrame:function (func) {
        return Browser.requestAnimationFrame(function() {
          if (!ABORT) func();
        });
      },safeSetTimeout:function (func, timeout) {
        Module['noExitRuntime'] = true;
        return setTimeout(function() {
          if (!ABORT) func();
        }, timeout);
      },safeSetInterval:function (func, timeout) {
        Module['noExitRuntime'] = true;
        return setInterval(function() {
          if (!ABORT) func();
        }, timeout);
      },getMimetype:function (name) {
        return {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'bmp': 'image/bmp',
          'ogg': 'audio/ogg',
          'wav': 'audio/wav',
          'mp3': 'audio/mpeg'
        }[name.substr(name.lastIndexOf('.')+1)];
      },getUserMedia:function (func) {
        if(!window.getUserMedia) {
          window.getUserMedia = navigator['getUserMedia'] ||
                                navigator['mozGetUserMedia'];
        }
        window.getUserMedia(func);
      },getMovementX:function (event) {
        return event['movementX'] ||
               event['mozMovementX'] ||
               event['webkitMovementX'] ||
               0;
      },getMovementY:function (event) {
        return event['movementY'] ||
               event['mozMovementY'] ||
               event['webkitMovementY'] ||
               0;
      },getMouseWheelDelta:function (event) {
        var delta = 0;
        switch (event.type) {
          case 'DOMMouseScroll': 
            delta = event.detail;
            break;
          case 'mousewheel': 
            delta = event.wheelDelta;
            break;
          case 'wheel': 
            delta = event['deltaY'];
            break;
          default:
            throw 'unrecognized mouse wheel event: ' + event.type;
        }
        return delta;
      },mouseX:0,mouseY:0,mouseMovementX:0,mouseMovementY:0,touches:{},lastTouches:{},calculateMouseEvent:function (event) { // event should be mousemove, mousedown or mouseup
        if (Browser.pointerLock) {
          // When the pointer is locked, calculate the coordinates
          // based on the movement of the mouse.
          // Workaround for Firefox bug 764498
          if (event.type != 'mousemove' &&
              ('mozMovementX' in event)) {
            Browser.mouseMovementX = Browser.mouseMovementY = 0;
          } else {
            Browser.mouseMovementX = Browser.getMovementX(event);
            Browser.mouseMovementY = Browser.getMovementY(event);
          }
          
          // check if SDL is available
          if (typeof SDL != "undefined") {
          	Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
          	Browser.mouseY = SDL.mouseY + Browser.mouseMovementY;
          } else {
          	// just add the mouse delta to the current absolut mouse position
          	// FIXME: ideally this should be clamped against the canvas size and zero
          	Browser.mouseX += Browser.mouseMovementX;
          	Browser.mouseY += Browser.mouseMovementY;
          }        
        } else {
          // Otherwise, calculate the movement based on the changes
          // in the coordinates.
          var rect = Module["canvas"].getBoundingClientRect();
          var cw = Module["canvas"].width;
          var ch = Module["canvas"].height;
  
          // Neither .scrollX or .pageXOffset are defined in a spec, but
          // we prefer .scrollX because it is currently in a spec draft.
          // (see: http://www.w3.org/TR/2013/WD-cssom-view-20131217/)
          var scrollX = ((typeof window.scrollX !== 'undefined') ? window.scrollX : window.pageXOffset);
          var scrollY = ((typeof window.scrollY !== 'undefined') ? window.scrollY : window.pageYOffset);
          // If this assert lands, it's likely because the browser doesn't support scrollX or pageXOffset
          // and we have no viable fallback.
          assert((typeof scrollX !== 'undefined') && (typeof scrollY !== 'undefined'), 'Unable to retrieve scroll position, mouse positions likely broken.');
  
          if (event.type === 'touchstart' || event.type === 'touchend' || event.type === 'touchmove') {
            var touch = event.touch;
            if (touch === undefined) {
              return; // the "touch" property is only defined in SDL
  
            }
            var adjustedX = touch.pageX - (scrollX + rect.left);
            var adjustedY = touch.pageY - (scrollY + rect.top);
  
            adjustedX = adjustedX * (cw / rect.width);
            adjustedY = adjustedY * (ch / rect.height);
  
            var coords = { x: adjustedX, y: adjustedY };
            
            if (event.type === 'touchstart') {
              Browser.lastTouches[touch.identifier] = coords;
              Browser.touches[touch.identifier] = coords;
            } else if (event.type === 'touchend' || event.type === 'touchmove') {
              Browser.lastTouches[touch.identifier] = Browser.touches[touch.identifier];
              Browser.touches[touch.identifier] = { x: adjustedX, y: adjustedY };
            } 
            return;
          }
  
          var x = event.pageX - (scrollX + rect.left);
          var y = event.pageY - (scrollY + rect.top);
  
          // the canvas might be CSS-scaled compared to its backbuffer;
          // SDL-using content will want mouse coordinates in terms
          // of backbuffer units.
          x = x * (cw / rect.width);
          y = y * (ch / rect.height);
  
          Browser.mouseMovementX = x - Browser.mouseX;
          Browser.mouseMovementY = y - Browser.mouseY;
          Browser.mouseX = x;
          Browser.mouseY = y;
        }
      },xhrLoad:function (url, onload, onerror) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function xhr_onload() {
          if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
            onload(xhr.response);
          } else {
            onerror();
          }
        };
        xhr.onerror = onerror;
        xhr.send(null);
      },asyncLoad:function (url, onload, onerror, noRunDep) {
        Browser.xhrLoad(url, function(arrayBuffer) {
          assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
          onload(new Uint8Array(arrayBuffer));
          if (!noRunDep) removeRunDependency('al ' + url);
        }, function(event) {
          if (onerror) {
            onerror();
          } else {
            throw 'Loading data file "' + url + '" failed.';
          }
        });
        if (!noRunDep) addRunDependency('al ' + url);
      },resizeListeners:[],updateResizeListeners:function () {
        var canvas = Module['canvas'];
        Browser.resizeListeners.forEach(function(listener) {
          listener(canvas.width, canvas.height);
        });
      },setCanvasSize:function (width, height, noUpdates) {
        var canvas = Module['canvas'];
        Browser.updateCanvasDimensions(canvas, width, height);
        if (!noUpdates) Browser.updateResizeListeners();
      },windowedWidth:0,windowedHeight:0,setFullScreenCanvasSize:function () {
        // check if SDL is available   
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags | 0x00800000; // set SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },setWindowedCanvasSize:function () {
        // check if SDL is available       
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags & ~0x00800000; // clear SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },updateCanvasDimensions:function (canvas, wNative, hNative) {
        if (wNative && hNative) {
          canvas.widthNative = wNative;
          canvas.heightNative = hNative;
        } else {
          wNative = canvas.widthNative;
          hNative = canvas.heightNative;
        }
        var w = wNative;
        var h = hNative;
        if (Module['forcedAspectRatio'] && Module['forcedAspectRatio'] > 0) {
          if (w/h < Module['forcedAspectRatio']) {
            w = Math.round(h * Module['forcedAspectRatio']);
          } else {
            h = Math.round(w / Module['forcedAspectRatio']);
          }
        }
        if (((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
             document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
             document['fullScreenElement'] || document['fullscreenElement'] ||
             document['msFullScreenElement'] || document['msFullscreenElement'] ||
             document['webkitCurrentFullScreenElement']) === canvas.parentNode) && (typeof screen != 'undefined')) {
           var factor = Math.min(screen.width / w, screen.height / h);
           w = Math.round(w * factor);
           h = Math.round(h * factor);
        }
        if (Browser.resizeCanvas) {
          if (canvas.width  != w) canvas.width  = w;
          if (canvas.height != h) canvas.height = h;
          if (typeof canvas.style != 'undefined') {
            canvas.style.removeProperty( "width");
            canvas.style.removeProperty("height");
          }
        } else {
          if (canvas.width  != wNative) canvas.width  = wNative;
          if (canvas.height != hNative) canvas.height = hNative;
          if (typeof canvas.style != 'undefined') {
            if (w != wNative || h != hNative) {
              canvas.style.setProperty( "width", w + "px", "important");
              canvas.style.setProperty("height", h + "px", "important");
            } else {
              canvas.style.removeProperty( "width");
              canvas.style.removeProperty("height");
            }
          }
        }
      },wgetRequests:{},nextWgetRequestHandle:0,getNextWgetRequestHandle:function () {
        var handle = Browser.nextWgetRequestHandle;
        Browser.nextWgetRequestHandle++;
        return handle;
      }};

  function _time(ptr) {
      var ret = (Date.now()/1000)|0;
      if (ptr) {
        HEAP32[((ptr)>>2)]=ret;
      }
      return ret;
    }

  var _atan2f=Math_atan2;
___errno_state = Runtime.staticAlloc(4); HEAP32[((___errno_state)>>2)]=0;
Module["requestFullScreen"] = function Module_requestFullScreen(lockPointer, resizeCanvas) { Browser.requestFullScreen(lockPointer, resizeCanvas) };
  Module["requestAnimationFrame"] = function Module_requestAnimationFrame(func) { Browser.requestAnimationFrame(func) };
  Module["setCanvasSize"] = function Module_setCanvasSize(width, height, noUpdates) { Browser.setCanvasSize(width, height, noUpdates) };
  Module["pauseMainLoop"] = function Module_pauseMainLoop() { Browser.mainLoop.pause() };
  Module["resumeMainLoop"] = function Module_resumeMainLoop() { Browser.mainLoop.resume() };
  Module["getUserMedia"] = function Module_getUserMedia() { Browser.getUserMedia() }
FS.staticInit();__ATINIT__.unshift({ func: function() { if (!Module["noFSInit"] && !FS.init.initialized) FS.init() } });__ATMAIN__.push({ func: function() { FS.ignorePermissions = false } });__ATEXIT__.push({ func: function() { FS.quit() } });Module["FS_createFolder"] = FS.createFolder;Module["FS_createPath"] = FS.createPath;Module["FS_createDataFile"] = FS.createDataFile;Module["FS_createPreloadedFile"] = FS.createPreloadedFile;Module["FS_createLazyFile"] = FS.createLazyFile;Module["FS_createLink"] = FS.createLink;Module["FS_createDevice"] = FS.createDevice;
__ATINIT__.unshift({ func: function() { TTY.init() } });__ATEXIT__.push({ func: function() { TTY.shutdown() } });TTY.utf8 = new Runtime.UTF8Processor();
if (ENVIRONMENT_IS_NODE) { var fs = require("fs"); NODEFS.staticInit(); }
STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);

staticSealed = true; // seal the static portion of memory

STACK_MAX = STACK_BASE + TOTAL_STACK;

DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);

assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");



function nullFunc_iii(x) { Module["printErr"]("Invalid function pointer called with signature 'iii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info."); abort(x) }

function nullFunc_viii(x) { Module["printErr"]("Invalid function pointer called with signature 'viii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info."); abort(x) }

function invoke_iii(index,a1,a2) {
  try {
    return Module["dynCall_iii"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viii(index,a1,a2,a3) {
  try {
    Module["dynCall_viii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

Module.asmGlobalArg = { "Math": Math, "Int8Array": Int8Array, "Int16Array": Int16Array, "Int32Array": Int32Array, "Uint8Array": Uint8Array, "Uint16Array": Uint16Array, "Uint32Array": Uint32Array, "Float32Array": Float32Array, "Float64Array": Float64Array };
Module.asmLibraryArg = { "abort": abort, "assert": assert, "min": Math_min, "jsCall": jsCall, "nullFunc_iii": nullFunc_iii, "nullFunc_viii": nullFunc_viii, "invoke_iii": invoke_iii, "invoke_viii": invoke_viii, "_fflush": _fflush, "___errno_location": ___errno_location, "_emscripten_set_main_loop": _emscripten_set_main_loop, "_abort": _abort, "___setErrNo": ___setErrNo, "_fabsf": _fabsf, "_sbrk": _sbrk, "_time": _time, "_llvm_pow_f32": _llvm_pow_f32, "___assert_fail": ___assert_fail, "_emscripten_set_main_loop_timing": _emscripten_set_main_loop_timing, "_emscripten_memcpy_big": _emscripten_memcpy_big, "_sysconf": _sysconf, "_atan2f": _atan2f, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT, "ctlz_i8": ctlz_i8, "NaN": NaN, "Infinity": Infinity };
// EMSCRIPTEN_START_ASM
var asm = (function(global, env, buffer) {
  'almost asm';
  
  var HEAP8 = new global.Int8Array(buffer);
  var HEAP16 = new global.Int16Array(buffer);
  var HEAP32 = new global.Int32Array(buffer);
  var HEAPU8 = new global.Uint8Array(buffer);
  var HEAPU16 = new global.Uint16Array(buffer);
  var HEAPU32 = new global.Uint32Array(buffer);
  var HEAPF32 = new global.Float32Array(buffer);
  var HEAPF64 = new global.Float64Array(buffer);


  var STACKTOP=env.STACKTOP|0;
  var STACK_MAX=env.STACK_MAX|0;
  var tempDoublePtr=env.tempDoublePtr|0;
  var ABORT=env.ABORT|0;
  var ctlz_i8=env.ctlz_i8|0;

  var __THREW__ = 0;
  var threwValue = 0;
  var setjmpId = 0;
  var undef = 0;
  var nan = +env.NaN, inf = +env.Infinity;
  var tempInt = 0, tempBigInt = 0, tempBigIntP = 0, tempBigIntS = 0, tempBigIntR = 0.0, tempBigIntI = 0, tempBigIntD = 0, tempValue = 0, tempDouble = 0.0;

  var tempRet0 = 0;
  var tempRet1 = 0;
  var tempRet2 = 0;
  var tempRet3 = 0;
  var tempRet4 = 0;
  var tempRet5 = 0;
  var tempRet6 = 0;
  var tempRet7 = 0;
  var tempRet8 = 0;
  var tempRet9 = 0;
  var Math_floor=global.Math.floor;
  var Math_abs=global.Math.abs;
  var Math_sqrt=global.Math.sqrt;
  var Math_pow=global.Math.pow;
  var Math_cos=global.Math.cos;
  var Math_sin=global.Math.sin;
  var Math_tan=global.Math.tan;
  var Math_acos=global.Math.acos;
  var Math_asin=global.Math.asin;
  var Math_atan=global.Math.atan;
  var Math_atan2=global.Math.atan2;
  var Math_exp=global.Math.exp;
  var Math_log=global.Math.log;
  var Math_ceil=global.Math.ceil;
  var Math_imul=global.Math.imul;
  var abort=env.abort;
  var assert=env.assert;
  var Math_min=env.min;
  var jsCall=env.jsCall;
  var nullFunc_iii=env.nullFunc_iii;
  var nullFunc_viii=env.nullFunc_viii;
  var invoke_iii=env.invoke_iii;
  var invoke_viii=env.invoke_viii;
  var _fflush=env._fflush;
  var ___errno_location=env.___errno_location;
  var _emscripten_set_main_loop=env._emscripten_set_main_loop;
  var _abort=env._abort;
  var ___setErrNo=env.___setErrNo;
  var _fabsf=env._fabsf;
  var _sbrk=env._sbrk;
  var _time=env._time;
  var _llvm_pow_f32=env._llvm_pow_f32;
  var ___assert_fail=env.___assert_fail;
  var _emscripten_set_main_loop_timing=env._emscripten_set_main_loop_timing;
  var _emscripten_memcpy_big=env._emscripten_memcpy_big;
  var _sysconf=env._sysconf;
  var _atan2f=env._atan2f;
  var tempFloat = 0.0;

// EMSCRIPTEN_START_FUNCS
function stackAlloc(size) {
  size = size|0;
  var ret = 0;
  ret = STACKTOP;
  STACKTOP = (STACKTOP + size)|0;
STACKTOP = (STACKTOP + 15)&-16;
if ((STACKTOP|0) >= (STACK_MAX|0)) abort();

  return ret|0;
}
function stackSave() {
  return STACKTOP|0;
}
function stackRestore(top) {
  top = top|0;
  STACKTOP = top;
}

function setThrew(threw, value) {
  threw = threw|0;
  value = value|0;
  if ((__THREW__|0) == 0) {
    __THREW__ = threw;
    threwValue = value;
  }
}
function copyTempFloat(ptr) {
  ptr = ptr|0;
  HEAP8[tempDoublePtr>>0] = HEAP8[ptr>>0];
  HEAP8[tempDoublePtr+1>>0] = HEAP8[ptr+1>>0];
  HEAP8[tempDoublePtr+2>>0] = HEAP8[ptr+2>>0];
  HEAP8[tempDoublePtr+3>>0] = HEAP8[ptr+3>>0];
}
function copyTempDouble(ptr) {
  ptr = ptr|0;
  HEAP8[tempDoublePtr>>0] = HEAP8[ptr>>0];
  HEAP8[tempDoublePtr+1>>0] = HEAP8[ptr+1>>0];
  HEAP8[tempDoublePtr+2>>0] = HEAP8[ptr+2>>0];
  HEAP8[tempDoublePtr+3>>0] = HEAP8[ptr+3>>0];
  HEAP8[tempDoublePtr+4>>0] = HEAP8[ptr+4>>0];
  HEAP8[tempDoublePtr+5>>0] = HEAP8[ptr+5>>0];
  HEAP8[tempDoublePtr+6>>0] = HEAP8[ptr+6>>0];
  HEAP8[tempDoublePtr+7>>0] = HEAP8[ptr+7>>0];
}
function setTempRet0(value) {
  value = value|0;
  tempRet0 = value;
}
function getTempRet0() {
  return tempRet0|0;
}

function _cBinop_init($o,$k) {
 $o = $o|0;
 $k = +$k;
 var $0 = 0, $1 = 0.0, $2 = 0.0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $o;
 $1 = $k;
 $2 = $1;
 $3 = $0;
 HEAPF32[$3>>2] = $2;
 STACKTOP = sp;return 0;
}
function _cBinop_onMessage($_c,$o,$op,$letIn,$m,$sendMessage) {
 $_c = $_c|0;
 $o = $o|0;
 $op = $op|0;
 $letIn = $letIn|0;
 $m = $m|0;
 $sendMessage = $sendMessage|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0.0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0.0, $21 = 0, $22 = 0.0, $23 = 0.0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0.0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0.0, $36 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $f = 0.0, $n = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $o;
 $2 = $op;
 $3 = $letIn;
 $4 = $m;
 $5 = $sendMessage;
 $6 = $3;
 if ((($6|0) == 0)) {
  $7 = $4;
  $8 = (_msg_isFloat($7,0)|0);
  $9 = ($8|0)!=(0);
  if ($9) {
   $10 = $4;
   $11 = (_msg_isFloat($10,1)|0);
   $12 = ($11|0)!=(0);
   if ($12) {
    $13 = $4;
    $14 = (+_msg_getFloat($13,1));
    $15 = $1;
    HEAPF32[$15>>2] = $14;
   }
   $16 = (_msg_getByteSize(1)|0);
   $17 = STACKTOP; STACKTOP = STACKTOP + ((((1*$16)|0)+15)&-16)|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();;
   $n = $17;
   $18 = $2;
   $19 = $4;
   $20 = (+_msg_getFloat($19,0));
   $21 = $1;
   $22 = +HEAPF32[$21>>2];
   $23 = (+_cBinop_perform_op($18,$20,$22));
   $f = $23;
   $24 = $n;
   $25 = $4;
   $26 = (_msg_getTimestamp($25)|0);
   $27 = $f;
   (_msg_initWithFloat($24,$26,$27)|0);
   $28 = $5;
   $29 = $0;
   $30 = $n;
   FUNCTION_TABLE_viii[$28 & 63]($29,0,$30);
  }
  STACKTOP = sp;return;
 } else if ((($6|0) == 1)) {
  $31 = $4;
  $32 = (_msg_isFloat($31,0)|0);
  $33 = ($32|0)!=(0);
  if ($33) {
   $34 = $4;
   $35 = (+_msg_getFloat($34,0));
   $36 = $1;
   HEAPF32[$36>>2] = $35;
  }
  STACKTOP = sp;return;
 } else {
  STACKTOP = sp;return;
 }
}
function _msg_isFloat($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = ($6|0)==(1);
 $8 = $7&1;
 STACKTOP = sp;return ($8|0);
}
function _msg_getFloat($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = (($5) + 4|0);
 $7 = +HEAPF32[$6>>2];
 STACKTOP = sp;return (+$7);
}
function _msg_getByteSize($numElements) {
 $numElements = $numElements|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $numElements;
 $1 = $0;
 $2 = ($1>>>0)>(0);
 if ($2) {
  $3 = $0;
  $4 = (($3) - 1)|0;
  $5 = $4<<3;
  $6 = (16 + ($5))|0;
  STACKTOP = sp;return ($6|0);
 } else {
  ___assert_fail((8|0),(24|0),56,(48|0));
  // unreachable;
 }
 return (0)|0;
}
function _cBinop_perform_op($op,$f,$k) {
 $op = $op|0;
 $f = +$f;
 $k = +$k;
 var $0 = 0.0, $1 = 0, $10 = 0.0, $100 = 0.0, $101 = 0, $102 = 0.0, $103 = 0.0, $104 = 0.0, $105 = 0, $106 = 0.0, $107 = 0.0, $108 = 0.0, $109 = 0, $11 = 0.0, $110 = 0.0, $111 = 0.0, $112 = 0.0, $113 = 0, $114 = 0.0, $115 = 0.0;
 var $116 = 0.0, $117 = 0.0, $118 = 0.0, $119 = 0.0, $12 = 0.0, $120 = 0.0, $121 = 0.0, $122 = 0, $123 = 0.0, $124 = 0.0, $125 = 0.0, $126 = 0.0, $127 = 0.0, $128 = 0, $129 = 0.0, $13 = 0.0, $130 = 0, $131 = 0.0, $132 = 0.0, $133 = 0.0;
 var $134 = 0.0, $135 = 0.0, $14 = 0.0, $15 = 0, $16 = 0.0, $17 = 0.0, $18 = 0.0, $19 = 0.0, $2 = 0.0, $20 = 0.0, $21 = 0, $22 = 0.0, $23 = 0, $24 = 0, $25 = 0.0, $26 = 0.0, $27 = 0, $28 = 0.0, $29 = 0, $3 = 0.0;
 var $30 = 0, $31 = 0.0, $32 = 0.0, $33 = 0, $34 = 0.0, $35 = 0, $36 = 0.0, $37 = 0, $38 = 0, $39 = 0.0, $4 = 0, $40 = 0.0, $41 = 0.0, $42 = 0, $43 = 0.0, $44 = 0.0, $45 = 0.0, $46 = 0.0, $47 = 0.0, $48 = 0.0;
 var $49 = 0.0, $5 = 0.0, $50 = 0, $51 = 0.0, $52 = 0, $53 = 0, $54 = 0.0, $55 = 0.0, $56 = 0, $57 = 0.0, $58 = 0, $59 = 0, $6 = 0.0, $60 = 0.0, $61 = 0.0, $62 = 0, $63 = 0.0, $64 = 0, $65 = 0, $66 = 0.0;
 var $67 = 0.0, $68 = 0, $69 = 0.0, $7 = 0.0, $70 = 0, $71 = 0, $72 = 0.0, $73 = 0.0, $74 = 0, $75 = 0.0, $76 = 0, $77 = 0, $78 = 0.0, $79 = 0.0, $8 = 0.0, $80 = 0.0, $81 = 0, $82 = 0.0, $83 = 0.0, $84 = 0.0;
 var $85 = 0, $86 = 0.0, $87 = 0.0, $88 = 0, $89 = 0.0, $9 = 0.0, $90 = 0, $91 = 0.0, $92 = 0, $93 = 0.0, $94 = 0, $95 = 0.0, $96 = 0, $97 = 0.0, $98 = 0, $99 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $op;
 $2 = $f;
 $3 = $k;
 $4 = $1;
 do {
  switch ($4|0) {
  case 0:  {
   $5 = $2;
   $6 = $3;
   $7 = $5 + $6;
   $0 = $7;
   break;
  }
  case 1:  {
   $8 = $2;
   $9 = $3;
   $10 = $8 - $9;
   $0 = $10;
   break;
  }
  case 2:  {
   $11 = $2;
   $12 = $3;
   $13 = $11 * $12;
   $0 = $13;
   break;
  }
  case 3:  {
   $14 = $3;
   $15 = $14 != 0.0;
   if ($15) {
    $16 = $2;
    $17 = $3;
    $18 = $16 / $17;
    $19 = $18;
   } else {
    $19 = 0.0;
   }
   $0 = $19;
   break;
  }
  case 4:  {
   $20 = $2;
   $21 = (~~(($20)));
   $22 = $3;
   $23 = (~~(($22)));
   $24 = (($21|0) / ($23|0))&-1;
   $25 = (+($24|0));
   $0 = $25;
   break;
  }
  case 5:  {
   $26 = $2;
   $27 = (~~(($26)));
   $28 = $3;
   $29 = (~~(($28)));
   $30 = (($27|0) % ($29|0))&-1;
   $31 = (+($30|0));
   $0 = $31;
   break;
  }
  case 6:  {
   $32 = $3;
   $33 = $32 == 0.0;
   if ($33) {
    $40 = 0.0;
   } else {
    $34 = $2;
    $35 = (~~(($34)));
    $36 = $3;
    $37 = (~~(($36)));
    $38 = (($35|0) % ($37|0))&-1;
    $39 = (+($38|0));
    $40 = $39;
   }
   $2 = $40;
   $41 = $2;
   $42 = $41 < 0.0;
   if ($42) {
    $43 = $2;
    $44 = $3;
    $45 = (+Math_abs((+$44)));
    $46 = $43 + $45;
    $48 = $46;
   } else {
    $47 = $2;
    $48 = $47;
   }
   $0 = $48;
   break;
  }
  case 7:  {
   $49 = $2;
   $50 = (~~(($49)));
   $51 = $3;
   $52 = (~~(($51)));
   $53 = $50 << $52;
   $54 = (+($53|0));
   $0 = $54;
   break;
  }
  case 8:  {
   $55 = $2;
   $56 = (~~(($55)));
   $57 = $3;
   $58 = (~~(($57)));
   $59 = $56 >> $58;
   $60 = (+($59|0));
   $0 = $60;
   break;
  }
  case 9:  {
   $61 = $2;
   $62 = (~~(($61)));
   $63 = $3;
   $64 = (~~(($63)));
   $65 = $62 & $64;
   $66 = (+($65|0));
   $0 = $66;
   break;
  }
  case 10:  {
   $67 = $2;
   $68 = (~~(($67)));
   $69 = $3;
   $70 = (~~(($69)));
   $71 = $68 ^ $70;
   $72 = (+($71|0));
   $0 = $72;
   break;
  }
  case 11:  {
   $73 = $2;
   $74 = (~~(($73)));
   $75 = $3;
   $76 = (~~(($75)));
   $77 = $74 | $76;
   $78 = (+($77|0));
   $0 = $78;
   break;
  }
  case 12:  {
   $79 = $2;
   $80 = $3;
   $81 = $79 == $80;
   $82 = $81 ? 1.0 : 0.0;
   $0 = $82;
   break;
  }
  case 13:  {
   $83 = $2;
   $84 = $3;
   $85 = $83 != $84;
   $86 = $85 ? 1.0 : 0.0;
   $0 = $86;
   break;
  }
  case 14:  {
   $87 = $2;
   $88 = $87 == 0.0;
   if ($88) {
    $92 = 1;
   } else {
    $89 = $3;
    $90 = $89 == 0.0;
    $92 = $90;
   }
   $91 = $92 ? 0.0 : 1.0;
   $0 = $91;
   break;
  }
  case 15:  {
   $93 = $2;
   $94 = $93 == 0.0;
   if ($94) {
    $95 = $3;
    $96 = $95 == 0.0;
    $98 = $96;
   } else {
    $98 = 0;
   }
   $97 = $98 ? 0.0 : 1.0;
   $0 = $97;
   break;
  }
  case 16:  {
   $99 = $2;
   $100 = $3;
   $101 = $99 < $100;
   $102 = $101 ? 1.0 : 0.0;
   $0 = $102;
   break;
  }
  case 17:  {
   $103 = $2;
   $104 = $3;
   $105 = $103 <= $104;
   $106 = $105 ? 1.0 : 0.0;
   $0 = $106;
   break;
  }
  case 18:  {
   $107 = $2;
   $108 = $3;
   $109 = $107 > $108;
   $110 = $109 ? 1.0 : 0.0;
   $0 = $110;
   break;
  }
  case 19:  {
   $111 = $2;
   $112 = $3;
   $113 = $111 >= $112;
   $114 = $113 ? 1.0 : 0.0;
   $0 = $114;
   break;
  }
  case 20:  {
   $115 = $2;
   $116 = $3;
   $117 = (+_fmaxf($115,$116));
   $0 = $117;
   break;
  }
  case 21:  {
   $118 = $2;
   $119 = $3;
   $120 = (+_fminf($118,$119));
   $0 = $120;
   break;
  }
  case 22:  {
   $121 = $2;
   $122 = $121 > 0.0;
   if ($122) {
    $123 = $2;
    $124 = $3;
    $125 = (+Math_pow((+$123),(+$124)));
    $126 = $125;
   } else {
    $126 = 0.0;
   }
   $0 = $126;
   break;
  }
  case 23:  {
   $127 = $2;
   $128 = $127 == 0.0;
   if ($128) {
    $129 = $3;
    $130 = $129 == 0.0;
    if ($130) {
     $134 = 0.0;
    } else {
     label = 44;
    }
   } else {
    label = 44;
   }
   if ((label|0) == 44) {
    $131 = $2;
    $132 = $3;
    $133 = (+Math_atan2((+$131),(+$132)));
    $134 = $133;
   }
   $0 = $134;
   break;
  }
  default: {
   $0 = 0.0;
  }
  }
 } while(0);
 $135 = $0;
 STACKTOP = sp;return (+$135);
}
function _msg_getTimestamp($m) {
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 STACKTOP = sp;return ($2|0);
}
function _cBinop_k_onMessage($_c,$o,$op,$k,$letIn,$m,$sendMessage) {
 $_c = $_c|0;
 $o = $o|0;
 $op = $op|0;
 $k = +$k;
 $letIn = $letIn|0;
 $m = $m|0;
 $sendMessage = $sendMessage|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0.0, $18 = 0.0, $19 = 0.0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0.0, $25 = 0.0, $26 = 0.0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0.0, $30 = 0.0, $31 = 0, $32 = 0, $33 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $f = 0.0, $n = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $o;
 $2 = $op;
 $3 = $k;
 $4 = $letIn;
 $5 = $m;
 $6 = $sendMessage;
 $7 = $5;
 $8 = (_msg_isFloat($7,0)|0);
 $9 = ($8|0)!=(0);
 if (!($9)) {
  STACKTOP = sp;return;
 }
 $10 = $5;
 $11 = (_msg_getNumElements($10)|0);
 $12 = ($11|0)>(1);
 if ($12) {
  $13 = $5;
  $14 = (_msg_isFloat($13,1)|0);
  $15 = ($14|0)!=(0);
  if ($15) {
   $16 = $5;
   $17 = (+_msg_getFloat($16,1));
   $19 = $17;
  } else {
   label = 5;
  }
 } else {
  label = 5;
 }
 if ((label|0) == 5) {
  $18 = $3;
  $19 = $18;
 }
 $f = $19;
 $20 = (_msg_getByteSize(1)|0);
 $21 = STACKTOP; STACKTOP = STACKTOP + ((((1*$20)|0)+15)&-16)|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();;
 $n = $21;
 $22 = $2;
 $23 = $5;
 $24 = (+_msg_getFloat($23,0));
 $25 = $f;
 $26 = (+_cBinop_perform_op($22,$24,$25));
 $f = $26;
 $27 = $n;
 $28 = $5;
 $29 = (_msg_getTimestamp($28)|0);
 $30 = $f;
 (_msg_initWithFloat($27,$29,$30)|0);
 $31 = $6;
 $32 = $0;
 $33 = $n;
 FUNCTION_TABLE_viii[$31 & 63]($32,0,$33);
 STACKTOP = sp;return;
}
function _msg_getNumElements($m) {
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $0;
 $2 = (($1) + 4|0);
 $3 = HEAP16[$2>>1]|0;
 $4 = $3&65535;
 STACKTOP = sp;return ($4|0);
}
function _cCast_onMessage($_c,$castType,$letIn,$m,$sendMessage) {
 $_c = $_c|0;
 $castType = $castType|0;
 $letIn = $letIn|0;
 $m = $m|0;
 $sendMessage = $sendMessage|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0.0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $n = 0, $n1 = 0, $n2 = 0, $n3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $castType;
 $2 = $letIn;
 $3 = $m;
 $4 = $sendMessage;
 $5 = $1;
 if ((($5|0) == 2)) {
  $27 = $3;
  $28 = (_msg_getType($27,0)|0);
  if ((($28|0) == 0)) {
   $29 = (_msg_getByteSize6(1)|0);
   $30 = STACKTOP; STACKTOP = STACKTOP + ((((1*$29)|0)+15)&-16)|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();;
   $n2 = $30;
   $31 = $n2;
   $32 = $3;
   $33 = (_msg_getTimestamp7($32)|0);
   (_msg_initWithSymbol($31,$33,64)|0);
   $34 = $4;
   $35 = $0;
   $36 = $n2;
   FUNCTION_TABLE_viii[$34 & 63]($35,0,$36);
  } else if ((($28|0) == 1)) {
   $37 = (_msg_getByteSize6(1)|0);
   $38 = STACKTOP; STACKTOP = STACKTOP + ((((1*$37)|0)+15)&-16)|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();;
   $n3 = $38;
   $39 = $n3;
   $40 = $3;
   $41 = (_msg_getTimestamp7($40)|0);
   (_msg_initWithSymbol($39,$41,72)|0);
   $42 = $4;
   $43 = $0;
   $44 = $n3;
   FUNCTION_TABLE_viii[$42 & 63]($43,0,$44);
  } else if ((($28|0) == 2)) {
   $45 = $4;
   $46 = $0;
   $47 = $3;
   FUNCTION_TABLE_viii[$45 & 63]($46,0,$47);
  } else {
   STACKTOP = sp;return;
  }
  STACKTOP = sp;return;
 } else if ((($5|0) == 0)) {
  $6 = (_msg_getByteSize6(1)|0);
  $7 = STACKTOP; STACKTOP = STACKTOP + ((((1*$6)|0)+15)&-16)|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();;
  $n = $7;
  $8 = $n;
  $9 = $3;
  $10 = (_msg_getTimestamp7($9)|0);
  (_msg_initWithBang($8,$10)|0);
  $11 = $4;
  $12 = $0;
  $13 = $n;
  FUNCTION_TABLE_viii[$11 & 63]($12,0,$13);
  STACKTOP = sp;return;
 } else if ((($5|0) == 1)) {
  $14 = $3;
  $15 = (_msg_isFloat8($14,0)|0);
  $16 = ($15|0)!=(0);
  if ($16) {
   $17 = (_msg_getByteSize6(1)|0);
   $18 = STACKTOP; STACKTOP = STACKTOP + ((((1*$17)|0)+15)&-16)|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();;
   $n1 = $18;
   $19 = $n1;
   $20 = $3;
   $21 = (_msg_getTimestamp7($20)|0);
   $22 = $3;
   $23 = (+_msg_getFloat9($22,0));
   (_msg_initWithFloat($19,$21,$23)|0);
   $24 = $4;
   $25 = $0;
   $26 = $n1;
   FUNCTION_TABLE_viii[$24 & 63]($25,0,$26);
  }
  STACKTOP = sp;return;
 } else {
  STACKTOP = sp;return;
 }
}
function _msg_getByteSize6($numElements) {
 $numElements = $numElements|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $numElements;
 $1 = $0;
 $2 = ($1>>>0)>(0);
 if ($2) {
  $3 = $0;
  $4 = (($3) - 1)|0;
  $5 = $4<<3;
  $6 = (16 + ($5))|0;
  STACKTOP = sp;return ($6|0);
 } else {
  ___assert_fail((80|0),(96|0),56,(120|0));
  // unreachable;
 }
 return (0)|0;
}
function _msg_getTimestamp7($m) {
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 STACKTOP = sp;return ($2|0);
}
function _msg_isFloat8($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = ($6|0)==(1);
 $8 = $7&1;
 STACKTOP = sp;return ($8|0);
}
function _msg_getFloat9($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = (($5) + 4|0);
 $7 = +HEAPF32[$6>>2];
 STACKTOP = sp;return (+$7);
}
function _msg_getType($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = HEAP32[$5>>2]|0;
 STACKTOP = sp;return ($6|0);
}
function _cDelay_init($_c,$o,$delayMs) {
 $_c = $_c|0;
 $o = $o|0;
 $delayMs = +$delayMs;
 var $0 = 0, $1 = 0, $10 = 0, $2 = 0.0, $3 = 0, $4 = 0.0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $o;
 $2 = $delayMs;
 $3 = $0;
 $4 = $2;
 $5 = (_ctx_millisecondsToSamples($3,$4)|0);
 $6 = $1;
 HEAP32[$6>>2] = $5;
 $7 = $1;
 $8 = (($7) + 4|0);
 HEAP32[$8>>2] = 0;
 $9 = $1;
 $10 = (($9) + 8|0);
 ;HEAP32[$10+0>>2]=0|0;HEAP32[$10+4>>2]=0|0;HEAP32[$10+8>>2]=0|0;HEAP32[$10+12>>2]=0|0;HEAP32[$10+16>>2]=0|0;HEAP32[$10+20>>2]=0|0;HEAP32[$10+24>>2]=0|0;HEAP32[$10+28>>2]=0|0;
 STACKTOP = sp;return 0;
}
function _cDelay_onMessage($_c,$o,$letIn,$m,$sendMessage) {
 $_c = $_c|0;
 $o = $o|0;
 $letIn = $letIn|0;
 $m = $m|0;
 $sendMessage = $sendMessage|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0.0, $96 = 0, $97 = 0, $i = 0, $i1 = 0;
 var $n = 0, $n2 = 0, $ts = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $o;
 $2 = $letIn;
 $3 = $m;
 $4 = $sendMessage;
 $5 = $2;
 if ((($5|0) == 0)) {
  $6 = $3;
  $7 = (_msg_compareSymbol($6,0,136)|0);
  if ($7) {
   $i = 0;
   while(1) {
    $8 = $i;
    $9 = ($8|0)<(8);
    if (!($9)) {
     break;
    }
    $10 = $i;
    $11 = $1;
    $12 = (($11) + 8|0);
    $13 = (($12) + ($10<<2)|0);
    $14 = HEAP32[$13>>2]|0;
    $n = $14;
    $15 = $n;
    $16 = ($15|0)!=(0|0);
    if ($16) {
     $17 = $n;
     $18 = (_msg_getTimestamp12($17)|0);
     $19 = $0;
     $20 = (_ctx_getBlockStartTimestamp($19)|0);
     $21 = ($18>>>0)>=($20>>>0);
     if ($21) {
      $22 = $n;
      $23 = $3;
      $24 = (_msg_getTimestamp12($23)|0);
      _msg_setTimestamp($22,$24);
      $25 = $4;
      $26 = $0;
      $27 = $n;
      FUNCTION_TABLE_viii[$25 & 63]($26,0,$27);
      $28 = $0;
      $29 = $n;
      _ctx_cancelMessage($28,$29);
     }
    }
    $30 = $i;
    $31 = $1;
    $32 = (($31) + 8|0);
    $33 = (($32) + ($30<<2)|0);
    HEAP32[$33>>2] = 0;
    $34 = $i;
    $35 = (($34) + 1)|0;
    $i = $35;
   }
   $36 = $1;
   $37 = (($36) + 4|0);
   HEAP32[$37>>2] = 0;
  } else {
   $38 = $3;
   $39 = (_msg_compareSymbol($38,0,144)|0);
   if ($39) {
    $i1 = 0;
    while(1) {
     $40 = $i1;
     $41 = ($40|0)<(8);
     if (!($41)) {
      break;
     }
     $42 = $i1;
     $43 = $1;
     $44 = (($43) + 8|0);
     $45 = (($44) + ($42<<2)|0);
     $46 = HEAP32[$45>>2]|0;
     $n2 = $46;
     $47 = $n2;
     $48 = ($47|0)!=(0|0);
     if ($48) {
      $49 = $n2;
      $50 = (_msg_getTimestamp12($49)|0);
      $51 = $0;
      $52 = (_ctx_getBlockStartTimestamp($51)|0);
      $53 = ($50>>>0)>=($52>>>0);
      if ($53) {
       $54 = $0;
       $55 = $n2;
       _ctx_cancelMessage($54,$55);
      }
     }
     $56 = $i1;
     $57 = $1;
     $58 = (($57) + 8|0);
     $59 = (($58) + ($56<<2)|0);
     HEAP32[$59>>2] = 0;
     $60 = $i1;
     $61 = (($60) + 1)|0;
     $i1 = $61;
    }
    $62 = $1;
    $63 = (($62) + 4|0);
    HEAP32[$63>>2] = 0;
   } else {
    $64 = $3;
    $65 = (_msg_getTimestamp12($64)|0);
    $ts = $65;
    $66 = $3;
    $67 = $ts;
    $68 = $1;
    $69 = HEAP32[$68>>2]|0;
    $70 = (($67) + ($69))|0;
    _msg_setTimestamp($66,$70);
    $71 = $0;
    $72 = $3;
    $73 = $4;
    $74 = (_ctx_scheduleMessage($71,$72,$73,0)|0);
    $75 = $1;
    $76 = (($75) + 4|0);
    $77 = HEAP32[$76>>2]|0;
    $78 = $1;
    $79 = (($78) + 8|0);
    $80 = (($79) + ($77<<2)|0);
    HEAP32[$80>>2] = $74;
    $81 = $1;
    $82 = (($81) + 4|0);
    $83 = HEAP32[$82>>2]|0;
    $84 = (($83) + 1)|0;
    $85 = (($84|0) % 8)&-1;
    $86 = $1;
    $87 = (($86) + 4|0);
    HEAP32[$87>>2] = $85;
    $88 = $3;
    $89 = $ts;
    _msg_setTimestamp($88,$89);
   }
  }
  STACKTOP = sp;return;
 } else if ((($5|0) == 1)) {
  $90 = $3;
  $91 = (_msg_isFloat13($90,0)|0);
  $92 = ($91|0)!=(0);
  if ($92) {
   $93 = $0;
   $94 = $3;
   $95 = (+_msg_getFloat14($94,0));
   $96 = (_ctx_millisecondsToSamples($93,$95)|0);
   $97 = $1;
   HEAP32[$97>>2] = $96;
  }
  STACKTOP = sp;return;
 } else {
  STACKTOP = sp;return;
 }
}
function _ctx_millisecondsToSamples($_c,$timeInMs) {
 $_c = $_c|0;
 $timeInMs = +$timeInMs;
 var $0 = 0, $1 = 0.0, $2 = 0.0, $3 = 0.0, $4 = 0, $5 = 0, $6 = 0.0, $7 = 0.0, $8 = 0.0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $timeInMs;
 $2 = $1;
 $3 = $2;
 $4 = $0;
 $5 = (($4) + 8|0);
 $6 = +HEAPF64[$5>>3];
 $7 = $3 * $6;
 $8 = $7 / 1000.0;
 $9 = (~~(($8)));
 STACKTOP = sp;return ($9|0);
}
function _msg_getTimestamp12($m) {
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 STACKTOP = sp;return ($2|0);
}
function _ctx_getBlockStartTimestamp($_c) {
 $_c = $_c|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $0;
 $2 = (($1) + 16|0);
 $3 = HEAP32[$2>>2]|0;
 STACKTOP = sp;return ($3|0);
}
function _msg_setTimestamp($m,$timestamp) {
 $m = $m|0;
 $timestamp = $timestamp|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $timestamp;
 $2 = $1;
 $3 = $0;
 HEAP32[$3>>2] = $2;
 STACKTOP = sp;return;
}
function _ctx_scheduleMessage($_c,$m,$sendMessage,$outletIndex) {
 $_c = $_c|0;
 $m = $m|0;
 $sendMessage = $sendMessage|0;
 $outletIndex = $outletIndex|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $m;
 $2 = $sendMessage;
 $3 = $outletIndex;
 $4 = $0;
 $5 = (($4) + 32|0);
 $6 = $1;
 $7 = $3;
 $8 = $2;
 $9 = (_mq_addMessageByTimestamp($5,$6,$7,$8)|0);
 STACKTOP = sp;return ($9|0);
}
function _msg_isFloat13($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = ($6|0)==(1);
 $8 = $7&1;
 STACKTOP = sp;return ($8|0);
}
function _msg_getFloat14($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = (($5) + 4|0);
 $7 = +HEAPF32[$6>>2];
 STACKTOP = sp;return (+$7);
}
function _cSystem_onMessage($_c,$o,$letIn,$m,$sendMessage) {
 $_c = $_c|0;
 $o = $o|0;
 $letIn = $letIn|0;
 $m = $m|0;
 $sendMessage = $sendMessage|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0.0, $14 = 0.0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0.0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0.0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0.0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0.0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0.0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0.0, $71 = 0, $72 = 0, $73 = 0, $8 = 0, $9 = 0, $n = 0, $o1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $o;
 $2 = $letIn;
 $3 = $m;
 $4 = $sendMessage;
 $5 = (_msg_getByteSize20(1)|0);
 $6 = STACKTOP; STACKTOP = STACKTOP + ((((1*$5)|0)+15)&-16)|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();;
 $n = $6;
 $7 = $3;
 $8 = (_msg_compareSymbol($7,0,152)|0);
 if ($8) {
  $9 = $n;
  $10 = $3;
  $11 = (_msg_getTimestamp21($10)|0);
  $12 = $0;
  $13 = (+_ctx_getSampleRate($12));
  $14 = $13;
  (_msg_initWithFloat($9,$11,$14)|0);
 } else {
  $15 = $3;
  $16 = (_msg_compareSymbol($15,0,168)|0);
  if ($16) {
   $17 = $n;
   $18 = $3;
   $19 = (_msg_getTimestamp21($18)|0);
   $20 = $0;
   $21 = (_ctx_getNumInputChannels($20)|0);
   $22 = (+($21|0));
   (_msg_initWithFloat($17,$19,$22)|0);
  } else {
   $23 = $3;
   $24 = (_msg_compareSymbol($23,0,192)|0);
   if ($24) {
    $25 = $n;
    $26 = $3;
    $27 = (_msg_getTimestamp21($26)|0);
    $28 = $0;
    $29 = (_ctx_getNumOutputChannels($28)|0);
    $30 = (+($29|0));
    (_msg_initWithFloat($25,$27,$30)|0);
   } else {
    $31 = $3;
    $32 = (_msg_compareSymbol($31,0,216)|0);
    if ($32) {
     $33 = $n;
     $34 = $3;
     $35 = (_msg_getTimestamp21($34)|0);
     $36 = $3;
     $37 = (_msg_getTimestamp21($36)|0);
     $38 = (+($37>>>0));
     (_msg_initWithFloat($33,$35,$38)|0);
    } else {
     $39 = $3;
     $40 = (_msg_compareSymbol($39,0,232)|0);
     if (!($40)) {
      STACKTOP = sp;return;
     }
     $41 = $0;
     $42 = $3;
     $43 = (_msg_getHash($42,1)|0);
     $44 = (_ctx_getTableForHash($41,$43)|0);
     $o1 = $44;
     $45 = $o1;
     $46 = ($45|0)!=(0|0);
     if (!($46)) {
      STACKTOP = sp;return;
     }
     $47 = $3;
     $48 = (_msg_compareSymbol($47,2,240)|0);
     if ($48) {
      $49 = $n;
      $50 = $3;
      $51 = (_msg_getTimestamp21($50)|0);
      $52 = $o1;
      $53 = (_hTable_getLength($52)|0);
      $54 = (+($53>>>0));
      (_msg_initWithFloat($49,$51,$54)|0);
     } else {
      $55 = $3;
      $56 = (_msg_compareSymbol($55,2,248)|0);
      do {
       if ($56) {
        $57 = $n;
        $58 = $3;
        $59 = (_msg_getTimestamp21($58)|0);
        $60 = $o1;
        $61 = (_hTable_getSize($60)|0);
        $62 = (+($61>>>0));
        (_msg_initWithFloat($57,$59,$62)|0);
       } else {
        $63 = $3;
        $64 = (_msg_compareSymbol($63,2,256)|0);
        if ($64) {
         $65 = $n;
         $66 = $3;
         $67 = (_msg_getTimestamp21($66)|0);
         $68 = $o1;
         $69 = (_hTable_getHead($68)|0);
         $70 = (+($69>>>0));
         (_msg_initWithFloat($65,$67,$70)|0);
         break;
        } else {
         STACKTOP = sp;return;
        }
       }
      } while(0);
     }
    }
   }
  }
 }
 $71 = $4;
 $72 = $0;
 $73 = $n;
 FUNCTION_TABLE_viii[$71 & 63]($72,0,$73);
 STACKTOP = sp;return;
}
function _msg_getByteSize20($numElements) {
 $numElements = $numElements|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $numElements;
 $1 = $0;
 $2 = ($1>>>0)>(0);
 if ($2) {
  $3 = $0;
  $4 = (($3) - 1)|0;
  $5 = $4<<3;
  $6 = (16 + ($5))|0;
  STACKTOP = sp;return ($6|0);
 } else {
  ___assert_fail((264|0),(280|0),56,(304|0));
  // unreachable;
 }
 return (0)|0;
}
function _msg_getTimestamp21($m) {
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 STACKTOP = sp;return ($2|0);
}
function _ctx_getSampleRate($_c) {
 $_c = $_c|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $0;
 $2 = (($1) + 8|0);
 $3 = +HEAPF64[$2>>3];
 STACKTOP = sp;return (+$3);
}
function _ctx_getNumInputChannels($_c) {
 $_c = $_c|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 STACKTOP = sp;return ($2|0);
}
function _ctx_getNumOutputChannels($_c) {
 $_c = $_c|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $0;
 $2 = (($1) + 4|0);
 $3 = HEAP32[$2>>2]|0;
 STACKTOP = sp;return ($3|0);
}
function _ctx_getTableForHash($_c,$h) {
 $_c = $_c|0;
 $h = $h|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $h;
 $2 = $0;
 $3 = (($2) + 28|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = $0;
 $6 = $1;
 $7 = (FUNCTION_TABLE_iii[$4 & 7]($5,$6)|0);
 STACKTOP = sp;return ($7|0);
}
function _hTable_getLength($o) {
 $o = $o|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $o;
 $1 = $0;
 $2 = (($1) + 4|0);
 $3 = HEAP32[$2>>2]|0;
 STACKTOP = sp;return ($3|0);
}
function _hTable_getSize($o) {
 $o = $o|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $o;
 $1 = $0;
 $2 = (($1) + 8|0);
 $3 = HEAP32[$2>>2]|0;
 STACKTOP = sp;return ($3|0);
}
function _hTable_getHead($o) {
 $o = $o|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $o;
 $1 = $0;
 $2 = (($1) + 12|0);
 $3 = HEAP32[$2>>2]|0;
 STACKTOP = sp;return ($3|0);
}
function _cVar_init_f($o,$k) {
 $o = $o|0;
 $k = +$k;
 var $0 = 0, $1 = 0.0, $2 = 0, $3 = 0.0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $o;
 $1 = $k;
 $2 = $0;
 HEAP32[$2>>2] = 1;
 $3 = $1;
 $4 = $0;
 $5 = (($4) + 4|0);
 HEAPF32[$5>>2] = $3;
 STACKTOP = sp;return 0;
}
function _cVar_init_s($o,$s) {
 $o = $o|0;
 $s = $s|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $o;
 $1 = $s;
 $2 = $0;
 HEAP32[$2>>2] = 3;
 $3 = $1;
 $4 = (_msg_symbolToHash($3)|0);
 $5 = $0;
 $6 = (($5) + 4|0);
 HEAP32[$6>>2] = $4;
 STACKTOP = sp;return 0;
}
function _cVar_onMessage($_c,$o,$letIn,$m,$sendMessage) {
 $_c = $_c|0;
 $o = $o|0;
 $letIn = $letIn|0;
 $m = $m|0;
 $sendMessage = $sendMessage|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0.0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0.0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0.0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $n = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $o;
 $2 = $letIn;
 $3 = $m;
 $4 = $sendMessage;
 $5 = $2;
 if ((($5|0) == 0)) {
  $6 = $3;
  $7 = (_msg_getType25($6,0)|0);
  if ((($7|0) == 1)) {
   $31 = $1;
   HEAP32[$31>>2] = 1;
   $32 = $3;
   $33 = (+_msg_getFloat28($32,0));
   $34 = $1;
   $35 = (($34) + 4|0);
   HEAPF32[$35>>2] = $33;
   $36 = $4;
   $37 = $0;
   $38 = $3;
   FUNCTION_TABLE_viii[$36 & 63]($37,0,$38);
  } else if ((($7|0) == 0)) {
   $8 = (_msg_getByteSize26(1)|0);
   $9 = STACKTOP; STACKTOP = STACKTOP + ((((1*$8)|0)+15)&-16)|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();;
   $n = $9;
   $10 = $1;
   $11 = HEAP32[$10>>2]|0;
   $12 = ($11|0)==(1);
   do {
    if ($12) {
     $13 = $n;
     $14 = $3;
     $15 = (_msg_getTimestamp27($14)|0);
     $16 = $1;
     $17 = (($16) + 4|0);
     $18 = +HEAPF32[$17>>2];
     (_msg_initWithFloat($13,$15,$18)|0);
    } else {
     $19 = $1;
     $20 = HEAP32[$19>>2]|0;
     $21 = ($20|0)==(3);
     if ($21) {
      $22 = $n;
      $23 = $3;
      $24 = (_msg_getTimestamp27($23)|0);
      $25 = $1;
      $26 = (($25) + 4|0);
      $27 = HEAP32[$26>>2]|0;
      (_msg_initWithHash($22,$24,$27)|0);
      break;
     } else {
      STACKTOP = sp;return;
     }
    }
   } while(0);
   $28 = $4;
   $29 = $0;
   $30 = $n;
   FUNCTION_TABLE_viii[$28 & 63]($29,0,$30);
  } else if ((($7|0) == 3) | (($7|0) == 2)) {
   $39 = $1;
   HEAP32[$39>>2] = 3;
   $40 = $3;
   $41 = (_msg_getHash($40,0)|0);
   $42 = $1;
   $43 = (($42) + 4|0);
   HEAP32[$43>>2] = $41;
   $44 = $4;
   $45 = $0;
   $46 = $3;
   FUNCTION_TABLE_viii[$44 & 63]($45,0,$46);
  } else {
   STACKTOP = sp;return;
  }
  STACKTOP = sp;return;
 } else if ((($5|0) == 1)) {
  $47 = $3;
  $48 = (_msg_getType25($47,0)|0);
  if ((($48|0) == 1)) {
   $49 = $1;
   HEAP32[$49>>2] = 1;
   $50 = $3;
   $51 = (+_msg_getFloat28($50,0));
   $52 = $1;
   $53 = (($52) + 4|0);
   HEAPF32[$53>>2] = $51;
  } else if ((($48|0) == 3) | (($48|0) == 2)) {
   $54 = $1;
   HEAP32[$54>>2] = 3;
   $55 = $3;
   $56 = (_msg_getHash($55,0)|0);
   $57 = $1;
   $58 = (($57) + 4|0);
   HEAP32[$58>>2] = $56;
  } else {
  }
 }
 STACKTOP = sp;return;
}
function _msg_getType25($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = HEAP32[$5>>2]|0;
 STACKTOP = sp;return ($6|0);
}
function _msg_getByteSize26($numElements) {
 $numElements = $numElements|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $numElements;
 $1 = $0;
 $2 = ($1>>>0)>(0);
 if ($2) {
  $3 = $0;
  $4 = (($3) - 1)|0;
  $5 = $4<<3;
  $6 = (16 + ($5))|0;
  STACKTOP = sp;return ($6|0);
 } else {
  ___assert_fail((320|0),(336|0),56,(360|0));
  // unreachable;
 }
 return (0)|0;
}
function _msg_getTimestamp27($m) {
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 STACKTOP = sp;return ($2|0);
}
function _msg_getFloat28($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = (($5) + 4|0);
 $7 = +HEAPF32[$6>>2];
 STACKTOP = sp;return (+$7);
}
function _hv_msg_getByteSize($numElements) {
 $numElements = $numElements|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $numElements;
 $1 = $0;
 $2 = (_msg_getByteSize33($1)|0);
 STACKTOP = sp;return ($2|0);
}
function _hv_msg_init($m,$numElements,$timestamp) {
 $m = $m|0;
 $numElements = $numElements|0;
 $timestamp = $timestamp|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $numElements;
 $2 = $timestamp;
 $3 = $0;
 $4 = $1;
 $5 = $2;
 (_msg_init($3,$4,$5)|0);
 STACKTOP = sp;return;
}
function _hv_msg_getFloat($m,$i) {
 $m = $m|0;
 $i = $i|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $i;
 $2 = $0;
 $3 = $1;
 $4 = (+_msg_getFloat38($2,$3));
 STACKTOP = sp;return (+$4);
}
function _hv_msg_setFloat($m,$i,$f) {
 $m = $m|0;
 $i = $i|0;
 $f = +$f;
 var $0 = 0, $1 = 0, $2 = 0.0, $3 = 0, $4 = 0, $5 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $i;
 $2 = $f;
 $3 = $0;
 $4 = $1;
 $5 = $2;
 _msg_setFloat($3,$4,$5);
 STACKTOP = sp;return;
}
function _hv_getNumInputChannels($c) {
 $c = $c|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $c;
 $1 = $0;
 $2 = (_ctx_getNumInputChannels40($1)|0);
 STACKTOP = sp;return ($2|0);
}
function _hv_getNumOutputChannels($c) {
 $c = $c|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $c;
 $1 = $0;
 $2 = (_ctx_getNumOutputChannels41($1)|0);
 STACKTOP = sp;return ($2|0);
}
function _hv_setPrintHook($c,$f) {
 $c = $c|0;
 $f = $f|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $c;
 $1 = $f;
 $2 = $0;
 $3 = $1;
 _ctx_setPrintHook($2,$3);
 STACKTOP = sp;return;
}
function _hv_vscheduleMessageForReceiver($c,$receiverName,$delayMs,$format,$varargs) {
 $c = $c|0;
 $receiverName = $receiverName|0;
 $delayMs = +$delayMs;
 $format = $format|0;
 $varargs = $varargs|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0.0, $15 = 0.0, $16 = 0, $17 = 0.0, $18 = 0.0, $19 = 0.0, $2 = 0.0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0.0, $35 = 0.0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $5 = 0;
 var $6 = 0, $7 = 0, $8 = 0, $9 = 0, $ap = 0, $arglist_current = 0, $arglist_current2 = 0, $arglist_next = 0, $arglist_next3 = 0, $i = 0, $m = 0, $numElem = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $ap = sp + 32|0;
 $0 = $c;
 $1 = $receiverName;
 $2 = $delayMs;
 $3 = $format;
 HEAP32[$ap>>2] = $varargs;
 $4 = $3;
 $5 = (_strlen(($4|0))|0);
 $numElem = $5;
 $6 = $numElem;
 $7 = (_msg_getByteSize33($6)|0);
 $8 = STACKTOP; STACKTOP = STACKTOP + ((((1*$7)|0)+15)&-16)|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();;
 $m = $8;
 $9 = $m;
 $10 = $numElem;
 $11 = $0;
 $12 = (($11) + 16|0);
 $13 = HEAP32[$12>>2]|0;
 $14 = $2;
 $15 = (+_fmax(0.0,$14));
 $16 = $0;
 $17 = (+_ctx_getSampleRate39($16));
 $18 = $15 * $17;
 $19 = $18 / 1000.0;
 $20 = (~~(($19))>>>0);
 $21 = (($13) + ($20))|0;
 (_msg_init($9,$10,$21)|0);
 $i = 0;
 while(1) {
  $22 = $i;
  $23 = $numElem;
  $24 = ($22|0)<($23|0);
  if (!($24)) {
   break;
  }
  $25 = $i;
  $26 = $3;
  $27 = (($26) + ($25)|0);
  $28 = HEAP8[$27>>0]|0;
  $29 = $28 << 24 >> 24;
  if ((($29|0) == 115)) {
   $36 = $m;
   $37 = $i;
   $arglist_current2 = HEAP32[$ap>>2]|0;
   $38 = HEAP32[$arglist_current2>>2]|0;
   $arglist_next3 = (($arglist_current2) + 4|0);
   HEAP32[$ap>>2] = $arglist_next3;
   _msg_setSymbol($36,$37,$38);
  } else if ((($29|0) == 98)) {
   $30 = $m;
   $31 = $i;
   _msg_setBang($30,$31);
  } else if ((($29|0) == 102)) {
   $32 = $m;
   $33 = $i;
   $arglist_current = HEAP32[$ap>>2]|0;
   HEAP32[tempDoublePtr>>2]=HEAP32[$arglist_current>>2];HEAP32[tempDoublePtr+4>>2]=HEAP32[$arglist_current+4>>2];$34 = +HEAPF64[tempDoublePtr>>3];
   $arglist_next = (($arglist_current) + 8|0);
   HEAP32[$ap>>2] = $arglist_next;
   $35 = $34;
   _msg_setFloat($32,$33,$35);
  } else {
  }
  $39 = $i;
  $40 = (($39) + 1)|0;
  $i = $40;
 }
 $41 = $0;
 $42 = $1;
 $43 = $m;
 _ctx_scheduleMessageForReceiver($41,$42,$43);
 STACKTOP = sp;return;
}
function _hv_scheduleMessageForReceiver($c,$receiverName,$delayMs,$m) {
 $c = $c|0;
 $receiverName = $receiverName|0;
 $delayMs = +$delayMs;
 $m = $m|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0.0, $12 = 0.0, $13 = 0.0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $2 = 0.0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0.0, $9 = 0.0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $c;
 $1 = $receiverName;
 $2 = $delayMs;
 $3 = $m;
 $4 = $3;
 $5 = $0;
 $6 = (($5) + 16|0);
 $7 = HEAP32[$6>>2]|0;
 $8 = $2;
 $9 = (+_fmax(0.0,$8));
 $10 = $0;
 $11 = (+_ctx_getSampleRate39($10));
 $12 = $9 * $11;
 $13 = $12 / 1000.0;
 $14 = (~~(($13))>>>0);
 $15 = (($7) + ($14))|0;
 _msg_setTimestamp36($4,$15);
 $16 = $0;
 $17 = $1;
 $18 = $3;
 _ctx_scheduleMessageForReceiver($16,$17,$18);
 STACKTOP = sp;return;
}
function _msg_getByteSize33($numElements) {
 $numElements = $numElements|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $numElements;
 $1 = $0;
 $2 = ($1>>>0)>(0);
 if ($2) {
  $3 = $0;
  $4 = (($3) - 1)|0;
  $5 = $4<<3;
  $6 = (16 + ($5))|0;
  STACKTOP = sp;return ($6|0);
 } else {
  ___assert_fail((376|0),(392|0),56,(416|0));
  // unreachable;
 }
 return (0)|0;
}
function _msg_setTimestamp36($m,$timestamp) {
 $m = $m|0;
 $timestamp = $timestamp|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $timestamp;
 $2 = $1;
 $3 = $0;
 HEAP32[$3>>2] = $2;
 STACKTOP = sp;return;
}
function _msg_setBang($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 HEAP32[$5>>2] = 0;
 $6 = $0;
 $7 = (($6) + 8|0);
 $8 = $1;
 $9 = (($7) + ($8<<3)|0);
 $10 = (($9) + 4|0);
 HEAP32[$10>>2] = 0;
 STACKTOP = sp;return;
}
function _msg_getFloat38($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = (($5) + 4|0);
 $7 = +HEAPF32[$6>>2];
 STACKTOP = sp;return (+$7);
}
function _msg_setFloat($m,$index,$f) {
 $m = $m|0;
 $index = $index|0;
 $f = +$f;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0.0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0.0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $f;
 $3 = $0;
 $4 = (($3) + 8|0);
 $5 = $1;
 $6 = (($4) + ($5<<3)|0);
 HEAP32[$6>>2] = 1;
 $7 = $2;
 $8 = $0;
 $9 = (($8) + 8|0);
 $10 = $1;
 $11 = (($9) + ($10<<3)|0);
 $12 = (($11) + 4|0);
 HEAPF32[$12>>2] = $7;
 STACKTOP = sp;return;
}
function _msg_setSymbol($m,$index,$s) {
 $m = $m|0;
 $index = $index|0;
 $s = $s|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $s;
 $3 = $0;
 $4 = (($3) + 8|0);
 $5 = $1;
 $6 = (($4) + ($5<<3)|0);
 HEAP32[$6>>2] = 2;
 $7 = $2;
 $8 = $0;
 $9 = (($8) + 8|0);
 $10 = $1;
 $11 = (($9) + ($10<<3)|0);
 $12 = (($11) + 4|0);
 HEAP32[$12>>2] = $7;
 STACKTOP = sp;return;
}
function _ctx_getSampleRate39($_c) {
 $_c = $_c|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $0;
 $2 = (($1) + 8|0);
 $3 = +HEAPF64[$2>>3];
 STACKTOP = sp;return (+$3);
}
function _ctx_getNumInputChannels40($_c) {
 $_c = $_c|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 STACKTOP = sp;return ($2|0);
}
function _ctx_getNumOutputChannels41($_c) {
 $_c = $_c|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $0;
 $2 = (($1) + 4|0);
 $3 = HEAP32[$2>>2]|0;
 STACKTOP = sp;return ($3|0);
}
function _ctx_setPrintHook($_c,$f) {
 $_c = $_c|0;
 $f = $f|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $f;
 $2 = $1;
 $3 = $0;
 $4 = (($3) + 88|0);
 HEAP32[$4>>2] = $2;
 STACKTOP = sp;return;
}
function _ctx_scheduleMessageForReceiver($_c,$name,$m) {
 $_c = $_c|0;
 $name = $name|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $name;
 $2 = $m;
 $3 = $0;
 $4 = (($3) + 24|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = $0;
 $7 = $1;
 $8 = $2;
 FUNCTION_TABLE_viii[$5 & 63]($6,$7,$8);
 STACKTOP = sp;return;
}
function _ctx_cancelMessage($_c,$m) {
 $_c = $_c|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $m;
 $2 = $0;
 $3 = (($2) + 32|0);
 $4 = $1;
 _mq_removeMessage($3,$4);
 STACKTOP = sp;return;
}
function _hv_heavy_new($sampleRate) {
 $sampleRate = +$sampleRate;
 var $0 = 0.0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0;
 var $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0;
 var $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0;
 var $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0.0, $50 = 0, $51 = 0.0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0.0, $6 = 0, $60 = 0, $61 = 0;
 var $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0;
 var $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0;
 var $99 = 0, $_c = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $sampleRate;
 $1 = (_malloc(504)|0);
 $_c = $1;
 $2 = $_c;
 HEAP32[$2>>2] = 0;
 $3 = $_c;
 $4 = (($3) + 4|0);
 HEAP32[$4>>2] = 2;
 $5 = $0;
 $6 = $_c;
 $7 = (($6) + 8|0);
 HEAPF64[$7>>3] = $5;
 $8 = $_c;
 $9 = (($8) + 16|0);
 HEAP32[$9>>2] = 0;
 $10 = $_c;
 $11 = (($10) + 24|0);
 HEAP32[$11>>2] = 6;
 $12 = $_c;
 $13 = (($12) + 28|0);
 HEAP32[$13>>2] = 7;
 $14 = $_c;
 $15 = (($14) + 32|0);
 _mq_initWithPoolSize($15,10);
 $16 = $_c;
 $17 = (($16) + 96|0);
 HEAP32[$17>>2] = 0;
 $18 = $_c;
 $19 = (($18) + 88|0);
 HEAP32[$19>>2] = 0;
 $20 = $_c;
 $21 = (($20) + 92|0);
 HEAP32[$21>>2] = 0;
 $22 = $_c;
 $23 = (($22) + 100|0);
 HEAP32[$23>>2] = 0;
 $24 = $_c;
 $25 = (($24) + 20|0);
 HEAP32[$25>>2] = 504;
 $26 = $_c;
 $27 = (($26) + 104|0);
 $28 = $_c;
 $29 = (($28) + 380|0);
 $30 = (_sTabread_init($27,$29,1)|0);
 $31 = $_c;
 $32 = (($31) + 20|0);
 $33 = HEAP32[$32>>2]|0;
 $34 = (($33) + ($30))|0;
 HEAP32[$32>>2] = $34;
 $35 = $_c;
 $36 = (($35) + 116|0);
 $37 = (_sVarf_init($36,0.20000000298023224,0.0,1)|0);
 $38 = $_c;
 $39 = (($38) + 20|0);
 $40 = HEAP32[$39>>2]|0;
 $41 = (($40) + ($37))|0;
 HEAP32[$39>>2] = $41;
 $42 = $_c;
 $43 = (($42) + 120|0);
 $44 = (_sBiquad_k_init($43,0.0,0.0,0.0,0.0,0.0)|0);
 $45 = $_c;
 $46 = (($45) + 20|0);
 $47 = HEAP32[$46>>2]|0;
 $48 = (($47) + ($44))|0;
 HEAP32[$46>>2] = $48;
 $49 = $_c;
 $50 = (($49) + 156|0);
 $51 = $0;
 $52 = (_sPhasor_k_init($50,180.0,$51)|0);
 $53 = $_c;
 $54 = (($53) + 20|0);
 $55 = HEAP32[$54>>2]|0;
 $56 = (($55) + ($52))|0;
 HEAP32[$54>>2] = $56;
 $57 = $_c;
 $58 = (($57) + 168|0);
 $59 = $0;
 $60 = (_sPhasor_k_init($58,3.0,$59)|0);
 $61 = $_c;
 $62 = (($61) + 20|0);
 $63 = HEAP32[$62>>2]|0;
 $64 = (($63) + ($60))|0;
 HEAP32[$62>>2] = $64;
 $65 = $_c;
 $66 = (($65) + 180|0);
 $67 = (_sVarf_init($66,1.0,0.0,0)|0);
 $68 = $_c;
 $69 = (($68) + 20|0);
 $70 = HEAP32[$69>>2]|0;
 $71 = (($70) + ($67))|0;
 HEAP32[$69>>2] = $71;
 $72 = $_c;
 $73 = (($72) + 184|0);
 $74 = (_sVarf_init($73,-1.0,0.0,0)|0);
 $75 = $_c;
 $76 = (($75) + 20|0);
 $77 = HEAP32[$76>>2]|0;
 $78 = (($77) + ($74))|0;
 HEAP32[$76>>2] = $78;
 $79 = $_c;
 $80 = (($79) + 188|0);
 $81 = (_sBiquad_k_init($80,0.0,0.0,0.0,0.0,0.0)|0);
 $82 = $_c;
 $83 = (($82) + 20|0);
 $84 = HEAP32[$83>>2]|0;
 $85 = (($84) + ($81))|0;
 HEAP32[$83>>2] = $85;
 $86 = $_c;
 $87 = (($86) + 224|0);
 $88 = $_c;
 $89 = (($88) + 380|0);
 $90 = (_sTabwrite_init($87,$89)|0);
 $91 = $_c;
 $92 = (($91) + 20|0);
 $93 = HEAP32[$92>>2]|0;
 $94 = (($93) + ($90))|0;
 HEAP32[$92>>2] = $94;
 $95 = $_c;
 $96 = (($95) + 236|0);
 $97 = (_cBinop_init($96,0.0)|0);
 $98 = $_c;
 $99 = (($98) + 20|0);
 $100 = HEAP32[$99>>2]|0;
 $101 = (($100) + ($97))|0;
 HEAP32[$99>>2] = $101;
 $102 = $_c;
 $103 = (($102) + 244|0);
 $104 = (_cVar_init_f($103,20.0)|0);
 $105 = $_c;
 $106 = (($105) + 20|0);
 $107 = HEAP32[$106>>2]|0;
 $108 = (($107) + ($104))|0;
 HEAP32[$106>>2] = $108;
 $109 = $_c;
 $110 = (($109) + 272|0);
 $111 = (_cVar_init_f($110,0.0)|0);
 $112 = $_c;
 $113 = (($112) + 20|0);
 $114 = HEAP32[$113>>2]|0;
 $115 = (($114) + ($111))|0;
 HEAP32[$113>>2] = $115;
 $116 = $_c;
 $117 = (($116) + 296|0);
 $118 = (_cBinop_init($117,0.0)|0);
 $119 = $_c;
 $120 = (($119) + 20|0);
 $121 = HEAP32[$120>>2]|0;
 $122 = (($121) + ($118))|0;
 HEAP32[$120>>2] = $122;
 $123 = $_c;
 $124 = (($123) + 308|0);
 $125 = (_cVar_init_f($124,10.0)|0);
 $126 = $_c;
 $127 = (($126) + 20|0);
 $128 = HEAP32[$127>>2]|0;
 $129 = (($128) + ($125))|0;
 HEAP32[$127>>2] = $129;
 $130 = $_c;
 $131 = (($130) + 324|0);
 $132 = (_cVar_init_f($131,0.0)|0);
 $133 = $_c;
 $134 = (($133) + 20|0);
 $135 = HEAP32[$134>>2]|0;
 $136 = (($135) + ($132))|0;
 HEAP32[$134>>2] = $136;
 $137 = $_c;
 $138 = $_c;
 $139 = (($138) + 340|0);
 $140 = (_cDelay_init($137,$139,200.0)|0);
 $141 = $_c;
 $142 = (($141) + 20|0);
 $143 = HEAP32[$142>>2]|0;
 $144 = (($143) + ($140))|0;
 HEAP32[$142>>2] = $144;
 $145 = $_c;
 $146 = (($145) + 380|0);
 $147 = (_hTable_init($146,256)|0);
 $148 = $_c;
 $149 = (($148) + 20|0);
 $150 = HEAP32[$149>>2]|0;
 $151 = (($150) + ($147))|0;
 HEAP32[$149>>2] = $151;
 $152 = $_c;
 $153 = (($152) + 400|0);
 $154 = (_cBinop_init($153,0.0)|0);
 $155 = $_c;
 $156 = (($155) + 20|0);
 $157 = HEAP32[$156>>2]|0;
 $158 = (($157) + ($154))|0;
 HEAP32[$156>>2] = $158;
 $159 = $_c;
 $160 = (($159) + 404|0);
 $161 = (_cBinop_init($160,200.0)|0);
 $162 = $_c;
 $163 = (($162) + 20|0);
 $164 = HEAP32[$163>>2]|0;
 $165 = (($164) + ($161))|0;
 HEAP32[$163>>2] = $165;
 $166 = $_c;
 $167 = $_c;
 $168 = (($167) + 408|0);
 $169 = (_cDelay_init($166,$168,1000.0)|0);
 $170 = $_c;
 $171 = (($170) + 20|0);
 $172 = HEAP32[$171>>2]|0;
 $173 = (($172) + ($169))|0;
 HEAP32[$171>>2] = $173;
 $174 = $_c;
 $175 = (($174) + 452|0);
 $176 = (_cVar_init_s($175,432)|0);
 $177 = $_c;
 $178 = (($177) + 20|0);
 $179 = HEAP32[$178>>2]|0;
 $180 = (($179) + ($176))|0;
 HEAP32[$178>>2] = $180;
 $181 = $_c;
 $182 = $_c;
 $183 = (($182) + 460|0);
 $184 = (_cDelay_init($181,$183,200.0)|0);
 $185 = $_c;
 $186 = (($185) + 20|0);
 $187 = HEAP32[$186>>2]|0;
 $188 = (($187) + ($184))|0;
 HEAP32[$186>>2] = $188;
 $189 = $_c;
 $190 = (($189) + 500|0);
 $191 = (_cBinop_init($190,0.0)|0);
 $192 = $_c;
 $193 = (($192) + 20|0);
 $194 = HEAP32[$193>>2]|0;
 $195 = (($194) + ($191))|0;
 HEAP32[$193>>2] = $195;
 $196 = $_c;
 $197 = (_msg_getByteSize63(1)|0);
 $198 = STACKTOP; STACKTOP = STACKTOP + ((((1*$197)|0)+15)&-16)|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();;
 $199 = (_msg_initWithBang($198,0)|0);
 (_ctx_scheduleMessage64($196,$199,8,0)|0);
 $200 = $_c;
 $201 = (_msg_getByteSize63(1)|0);
 $202 = STACKTOP; STACKTOP = STACKTOP + ((((1*$201)|0)+15)&-16)|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();;
 $203 = (_msg_initWithBang($202,0)|0);
 (_ctx_scheduleMessage64($200,$203,9,0)|0);
 $204 = $_c;
 $205 = (_msg_getByteSize63(1)|0);
 $206 = STACKTOP; STACKTOP = STACKTOP + ((((1*$205)|0)+15)&-16)|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();;
 $207 = (_msg_initWithBang($206,0)|0);
 (_ctx_scheduleMessage64($204,$207,10,0)|0);
 $208 = $_c;
 $209 = (_msg_getByteSize63(1)|0);
 $210 = STACKTOP; STACKTOP = STACKTOP + ((((1*$209)|0)+15)&-16)|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();;
 $211 = (_msg_initWithBang($210,0)|0);
 (_ctx_scheduleMessage64($208,$211,11,0)|0);
 $212 = $_c;
 $213 = (_msg_getByteSize63(1)|0);
 $214 = STACKTOP; STACKTOP = STACKTOP + ((((1*$213)|0)+15)&-16)|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();;
 $215 = (_msg_initWithBang($214,0)|0);
 (_ctx_scheduleMessage64($212,$215,12,0)|0);
 $216 = $_c;
 $217 = (_msg_getByteSize63(1)|0);
 $218 = STACKTOP; STACKTOP = STACKTOP + ((((1*$217)|0)+15)&-16)|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();;
 $219 = (_msg_initWithBang($218,0)|0);
 (_ctx_scheduleMessage64($216,$219,13,0)|0);
 $220 = $_c;
 STACKTOP = sp;return ($220|0);
}
function _hv_heavy_free($_c) {
 $_c = $_c|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $0;
 $2 = (($1) + 380|0);
 _hTable_free($2);
 $3 = $0;
 $4 = (($3) + 96|0);
 $5 = HEAP32[$4>>2]|0;
 _free($5);
 $6 = $0;
 $7 = (($6) + 32|0);
 _mq_free($7);
 $8 = $0;
 _free($8);
 STACKTOP = sp;return;
}
function _hv_heavy_process($_c,$inputBuffers,$outputBuffers,$n4) {
 $_c = $_c|0;
 $inputBuffers = $inputBuffers|0;
 $outputBuffers = $outputBuffers|0;
 $n4 = $n4|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0.0, $101 = 0, $102 = 0, $103 = 0.0, $104 = 0.0, $105 = 0.0, $106 = 0.0, $107 = 0.0, $108 = 0.0, $109 = 0.0, $11 = 0, $110 = 0.0, $111 = 0.0, $112 = 0.0, $113 = 0.0, $114 = 0.0, $115 = 0.0;
 var $116 = 0, $117 = 0, $118 = 0.0, $119 = 0, $12 = 0, $120 = 0, $121 = 0.0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0.0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0;
 var $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0.0, $39 = 0.0, $4 = 0, $40 = 0.0, $41 = 0, $42 = 0, $43 = 0.0, $44 = 0.0, $45 = 0.0;
 var $46 = 0.0, $47 = 0.0, $48 = 0.0, $49 = 0.0, $5 = 0, $50 = 0.0, $51 = 0.0, $52 = 0.0, $53 = 0.0, $54 = 0.0, $55 = 0.0, $56 = 0.0, $57 = 0.0, $58 = 0.0, $59 = 0.0, $6 = 0, $60 = 0.0, $61 = 0.0, $62 = 0.0, $63 = 0.0;
 var $64 = 0, $65 = 0, $66 = 0.0, $67 = 0.0, $68 = 0.0, $69 = 0.0, $7 = 0, $70 = 0.0, $71 = 0.0, $72 = 0.0, $73 = 0.0, $74 = 0.0, $75 = 0.0, $76 = 0.0, $77 = 0.0, $78 = 0.0, $79 = 0.0, $8 = 0, $80 = 0.0, $81 = 0.0;
 var $82 = 0.0, $83 = 0.0, $84 = 0.0, $85 = 0.0, $86 = 0.0, $87 = 0.0, $88 = 0.0, $89 = 0, $9 = 0, $90 = 0, $91 = 0.0, $92 = 0.0, $93 = 0, $94 = 0, $95 = 0.0, $96 = 0.0, $97 = 0.0, $98 = 0.0, $99 = 0.0, $Bf0 = 0;
 var $Bf1 = 0, $Bf2 = 0, $Bf3 = 0, $Bf4 = 0, $Bf5 = 0, $O0 = 0, $O1 = 0, $ZERO = 0, $n = 0, $nextBlock = 0, $node = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 64|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Bf0 = sp + 40|0;
 $Bf1 = sp + 48|0;
 $Bf2 = sp + 56|0;
 $Bf3 = sp + 60|0;
 $Bf4 = sp + 4|0;
 $Bf5 = sp + 28|0;
 $O0 = sp + 12|0;
 $O1 = sp;
 $ZERO = sp + 16|0;
 $0 = $_c;
 $1 = $inputBuffers;
 $2 = $outputBuffers;
 $3 = $n4;
 $4 = $3;
 $3 = $4;
 $5 = $3;
 $n = $5;
 _sZero_process($ZERO);
 $6 = $0;
 $7 = (($6) + 16|0);
 $8 = HEAP32[$7>>2]|0;
 $nextBlock = $8;
 while(1) {
  $9 = $3;
  $10 = ($9|0)!=(0);
  if (!($10)) {
   break;
  }
  $11 = $nextBlock;
  $12 = (($11) + 1)|0;
  $nextBlock = $12;
  while(1) {
   $13 = $0;
   $14 = (($13) + 32|0);
   $15 = $nextBlock;
   $16 = (_mq_hasMessageBefore($14,$15)|0);
   if (!($16)) {
    break;
   }
   $17 = $0;
   $18 = (($17) + 32|0);
   $19 = (_mq_peek($18)|0);
   $node = $19;
   $20 = $node;
   $21 = (($20) + 16|0);
   $22 = HEAP32[$21>>2]|0;
   $23 = $0;
   $24 = $node;
   $25 = (($24) + 8|0);
   $26 = HEAP32[$25>>2]|0;
   $27 = $node;
   $28 = (($27) + 12|0);
   $29 = HEAP32[$28>>2]|0;
   FUNCTION_TABLE_viii[$22 & 63]($23,$26,$29);
   $30 = $0;
   $31 = (($30) + 32|0);
   _mq_pop($31);
  }
  _sZero_process($O0);
  _sZero_process($O1);
  $32 = $0;
  $33 = (($32) + 104|0);
  ___hv_tabread_f($33,$Bf0);
  $34 = $0;
  $35 = (($34) + 116|0);
  _sVarf_process($35,$Bf1);
  $36 = $0;
  $37 = (($36) + 120|0);
  $38 = +HEAPF32[$Bf1>>2];
  _sBiquad_k_process($37,$38,$Bf1);
  $39 = +HEAPF32[$Bf0>>2];
  $40 = +HEAPF32[$Bf1>>2];
  ___hv_mul_f($39,$40,$Bf1);
  $41 = $0;
  $42 = (($41) + 156|0);
  ___hv_phasor_k_f($42,$Bf0);
  HEAPF32[$Bf2>>2] = 0.5;
  $43 = +HEAPF32[$Bf0>>2];
  $44 = +HEAPF32[$Bf2>>2];
  ___hv_sub_f($43,$44,$Bf2);
  $45 = +HEAPF32[$Bf2>>2];
  ___hv_abs_f($45,$Bf2);
  HEAPF32[$Bf0>>2] = 0.25;
  $46 = +HEAPF32[$Bf2>>2];
  $47 = +HEAPF32[$Bf0>>2];
  ___hv_sub_f($46,$47,$Bf0);
  HEAPF32[$Bf2>>2] = 6.2831897735595703;
  $48 = +HEAPF32[$Bf0>>2];
  $49 = +HEAPF32[$Bf2>>2];
  ___hv_mul_f($48,$49,$Bf2);
  $50 = +HEAPF32[$Bf2>>2];
  $51 = +HEAPF32[$Bf2>>2];
  ___hv_mul_f($50,$51,$Bf0);
  $52 = +HEAPF32[$Bf2>>2];
  $53 = +HEAPF32[$Bf0>>2];
  ___hv_mul_f($52,$53,$Bf3);
  HEAPF32[$Bf4>>2] = 0.16666699945926666;
  $54 = +HEAPF32[$Bf3>>2];
  $55 = +HEAPF32[$Bf4>>2];
  ___hv_mul_f($54,$55,$Bf4);
  $56 = +HEAPF32[$Bf2>>2];
  $57 = +HEAPF32[$Bf4>>2];
  ___hv_sub_f($56,$57,$Bf4);
  $58 = +HEAPF32[$Bf3>>2];
  $59 = +HEAPF32[$Bf0>>2];
  ___hv_mul_f($58,$59,$Bf0);
  HEAPF32[$Bf3>>2] = 0.0083333300426602364;
  $60 = +HEAPF32[$Bf0>>2];
  $61 = +HEAPF32[$Bf3>>2];
  ___hv_mul_f($60,$61,$Bf3);
  $62 = +HEAPF32[$Bf4>>2];
  $63 = +HEAPF32[$Bf3>>2];
  ___hv_add_f($62,$63,$Bf3);
  $64 = $0;
  $65 = (($64) + 168|0);
  ___hv_phasor_k_f($65,$Bf4);
  HEAPF32[$Bf0>>2] = 0.5;
  $66 = +HEAPF32[$Bf4>>2];
  $67 = +HEAPF32[$Bf0>>2];
  ___hv_sub_f($66,$67,$Bf0);
  $68 = +HEAPF32[$Bf0>>2];
  ___hv_abs_f($68,$Bf0);
  HEAPF32[$Bf4>>2] = 0.25;
  $69 = +HEAPF32[$Bf0>>2];
  $70 = +HEAPF32[$Bf4>>2];
  ___hv_sub_f($69,$70,$Bf4);
  HEAPF32[$Bf0>>2] = 6.2831897735595703;
  $71 = +HEAPF32[$Bf4>>2];
  $72 = +HEAPF32[$Bf0>>2];
  ___hv_mul_f($71,$72,$Bf0);
  $73 = +HEAPF32[$Bf0>>2];
  $74 = +HEAPF32[$Bf0>>2];
  ___hv_mul_f($73,$74,$Bf4);
  $75 = +HEAPF32[$Bf0>>2];
  $76 = +HEAPF32[$Bf4>>2];
  ___hv_mul_f($75,$76,$Bf2);
  HEAPF32[$Bf5>>2] = 0.16666699945926666;
  $77 = +HEAPF32[$Bf2>>2];
  $78 = +HEAPF32[$Bf5>>2];
  ___hv_mul_f($77,$78,$Bf5);
  $79 = +HEAPF32[$Bf0>>2];
  $80 = +HEAPF32[$Bf5>>2];
  ___hv_sub_f($79,$80,$Bf5);
  $81 = +HEAPF32[$Bf2>>2];
  $82 = +HEAPF32[$Bf4>>2];
  ___hv_mul_f($81,$82,$Bf4);
  HEAPF32[$Bf2>>2] = 0.0083333300426602364;
  $83 = +HEAPF32[$Bf4>>2];
  $84 = +HEAPF32[$Bf2>>2];
  ___hv_mul_f($83,$84,$Bf2);
  $85 = +HEAPF32[$Bf5>>2];
  $86 = +HEAPF32[$Bf2>>2];
  ___hv_add_f($85,$86,$Bf2);
  HEAPF32[$Bf5>>2] = 1000.0;
  $87 = +HEAPF32[$Bf2>>2];
  $88 = +HEAPF32[$Bf5>>2];
  ___hv_mul_f($87,$88,$Bf5);
  $89 = $0;
  $90 = (($89) + 180|0);
  _sVarf_process($90,$Bf2);
  $91 = +HEAPF32[$Bf5>>2];
  $92 = +HEAPF32[$Bf2>>2];
  ___hv_min_f($91,$92,$Bf2);
  $93 = $0;
  $94 = (($93) + 184|0);
  _sVarf_process($94,$Bf5);
  $95 = +HEAPF32[$Bf2>>2];
  $96 = +HEAPF32[$Bf5>>2];
  ___hv_max_f($95,$96,$Bf5);
  HEAPF32[$Bf2>>2] = 0.5;
  $97 = +HEAPF32[$Bf5>>2];
  $98 = +HEAPF32[$Bf2>>2];
  ___hv_mul_f($97,$98,$Bf2);
  HEAPF32[$Bf5>>2] = 0.5;
  $99 = +HEAPF32[$Bf2>>2];
  $100 = +HEAPF32[$Bf5>>2];
  ___hv_add_f($99,$100,$Bf5);
  $101 = $0;
  $102 = (($101) + 188|0);
  $103 = +HEAPF32[$Bf5>>2];
  _sBiquad_k_process($102,$103,$Bf5);
  $104 = +HEAPF32[$Bf3>>2];
  $105 = +HEAPF32[$Bf5>>2];
  ___hv_mul_f($104,$105,$Bf5);
  $106 = +HEAPF32[$Bf1>>2];
  $107 = +HEAPF32[$Bf5>>2];
  ___hv_add_f($106,$107,$Bf3);
  HEAPF32[$Bf2>>2] = 0.5;
  $108 = +HEAPF32[$Bf3>>2];
  $109 = +HEAPF32[$Bf2>>2];
  ___hv_mul_f($108,$109,$Bf2);
  $110 = +HEAPF32[$Bf2>>2];
  $111 = +HEAPF32[$O0>>2];
  ___hv_add_f($110,$111,$O0);
  $112 = +HEAPF32[$Bf2>>2];
  $113 = +HEAPF32[$O1>>2];
  ___hv_add_f($112,$113,$O1);
  $114 = +HEAPF32[$Bf1>>2];
  $115 = +HEAPF32[$Bf5>>2];
  ___hv_add_f($114,$115,$Bf5);
  $116 = $0;
  $117 = (($116) + 224|0);
  $118 = +HEAPF32[$Bf5>>2];
  ___hv_tabwrite_f($117,$118);
  $119 = $2;
  $120 = HEAP32[$119>>2]|0;
  $121 = +HEAPF32[$O0>>2];
  _sStore_process($120,$121);
  $122 = $2;
  $123 = HEAP32[$122>>2]|0;
  $124 = (($123) + 4|0);
  HEAP32[$122>>2] = $124;
  $125 = $2;
  $126 = (($125) + 4|0);
  $127 = HEAP32[$126>>2]|0;
  $128 = +HEAPF32[$O1>>2];
  _sStore_process($127,$128);
  $129 = $2;
  $130 = (($129) + 4|0);
  $131 = HEAP32[$130>>2]|0;
  $132 = (($131) + 4|0);
  HEAP32[$130>>2] = $132;
  $133 = $3;
  $134 = (($133) - 1)|0;
  $3 = $134;
 }
 $135 = $nextBlock;
 $136 = $0;
 $137 = (($136) + 16|0);
 HEAP32[$137>>2] = $135;
 $138 = $n;
 STACKTOP = sp;return ($138|0);
}
function _hv_heavy_process_inline($c,$inputBuffers,$outputBuffers,$n4) {
 $c = $c|0;
 $inputBuffers = $inputBuffers|0;
 $outputBuffers = $outputBuffers|0;
 $n4 = $n4|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, $bIn = 0, $bOut = 0, $i = 0, $n = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $c;
 $1 = $inputBuffers;
 $2 = $outputBuffers;
 $3 = $n4;
 $4 = $0;
 $5 = (_ctx_getNumInputChannels65($4)|0);
 $i = $5;
 $6 = $i;
 $7 = $6<<2;
 $8 = STACKTOP; STACKTOP = STACKTOP + ((((1*$7)|0)+15)&-16)|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();;
 $bIn = $8;
 while(1) {
  $9 = $i;
  $10 = (($9) + -1)|0;
  $i = $10;
  $11 = ($9|0)!=(0);
  if (!($11)) {
   break;
  }
  $12 = $1;
  $13 = $i;
  $14 = $3;
  $15 = Math_imul($13, $14)|0;
  $16 = (($12) + ($15<<2)|0);
  $17 = $i;
  $18 = $bIn;
  $19 = (($18) + ($17<<2)|0);
  HEAP32[$19>>2] = $16;
 }
 $20 = $0;
 $21 = (_ctx_getNumOutputChannels66($20)|0);
 $i = $21;
 $22 = $i;
 $23 = $22<<2;
 $24 = STACKTOP; STACKTOP = STACKTOP + ((((1*$23)|0)+15)&-16)|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();;
 $bOut = $24;
 while(1) {
  $25 = $i;
  $26 = (($25) + -1)|0;
  $i = $26;
  $27 = ($25|0)!=(0);
  if (!($27)) {
   break;
  }
  $28 = $2;
  $29 = $i;
  $30 = $3;
  $31 = Math_imul($29, $30)|0;
  $32 = (($28) + ($31<<2)|0);
  $33 = $i;
  $34 = $bOut;
  $35 = (($34) + ($33<<2)|0);
  HEAP32[$35>>2] = $32;
 }
 $36 = $0;
 $37 = $bIn;
 $38 = $bOut;
 $39 = $3;
 $40 = (_hv_heavy_process($36,$37,$38,$39)|0);
 $n = $40;
 $41 = $n;
 STACKTOP = sp;return ($41|0);
}
function _ctx_intern_scheduleMessageForReceiver($_c,$name,$m) {
 $_c = $_c|0;
 $name = $name|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $name;
 $2 = $m;
 $3 = $1;
 $4 = (_msg_symbolToHash($3)|0);
 if ((($4|0) == 596607957)) {
  $5 = $0;
  $6 = $2;
  (_ctx_scheduleMessage64($5,$6,14,0)|0);
 } else if ((($4|0) == 1412067001)) {
  $7 = $0;
  $8 = $2;
  (_ctx_scheduleMessage64($7,$8,15,0)|0);
 } else if ((($4|0) == 163601631)) {
  $9 = $0;
  $10 = $2;
  (_ctx_scheduleMessage64($9,$10,16,0)|0);
 } else if ((($4|0) == 923391142)) {
  $11 = $0;
  $12 = $2;
  (_ctx_scheduleMessage64($11,$12,17,0)|0);
 } else {
 }
 STACKTOP = sp;return;
}
function _ctx_intern_getTableForHash($_c,$h) {
 $_c = $_c|0;
 $h = $h|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $_c;
 $2 = $h;
 $3 = $2;
 $cond = ($3|0)==(1557608130);
 if ($cond) {
  $4 = $1;
  $5 = (($4) + 380|0);
  $0 = $5;
 } else {
  $0 = 0;
 }
 $6 = $0;
 STACKTOP = sp;return ($6|0);
}
function _msg_getByteSize63($numElements) {
 $numElements = $numElements|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $numElements;
 $1 = $0;
 $2 = ($1>>>0)>(0);
 if ($2) {
  $3 = $0;
  $4 = (($3) - 1)|0;
  $5 = $4<<3;
  $6 = (16 + ($5))|0;
  STACKTOP = sp;return ($6|0);
 } else {
  ___assert_fail((496|0),(512|0),56,(536|0));
  // unreachable;
 }
 return (0)|0;
}
function _cLoadbang_7wgV6_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $2;
 _cMsg_6RzG2_sendMessage($3,0,$4);
 $5 = $0;
 $6 = $2;
 _cSwitchcase_ltczC_onMessage($5,0,0,$6,0);
 STACKTOP = sp;return;
}
function _ctx_scheduleMessage64($_c,$m,$sendMessage,$outletIndex) {
 $_c = $_c|0;
 $m = $m|0;
 $sendMessage = $sendMessage|0;
 $outletIndex = $outletIndex|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $m;
 $2 = $sendMessage;
 $3 = $outletIndex;
 $4 = $0;
 $5 = (($4) + 32|0);
 $6 = $1;
 $7 = $3;
 $8 = $2;
 $9 = (_mq_addMessageByTimestamp($5,$6,$7,$8)|0);
 STACKTOP = sp;return ($9|0);
}
function _cLoadbang_1cs2d_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $2;
 _cMsg_BLdyD_sendMessage($3,0,$4);
 $5 = $0;
 $6 = $0;
 $7 = (($6) + 244|0);
 $8 = $2;
 _cVar_onMessage($5,$7,0,$8,18);
 STACKTOP = sp;return;
}
function _cLoadbang_TTwsH_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $0;
 $5 = (($4) + 272|0);
 $6 = $2;
 _cVar_onMessage($3,$5,0,$6,19);
 STACKTOP = sp;return;
}
function _cLoadbang_fDPjS_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $2;
 _cMsg_Fstr9_sendMessage($3,0,$4);
 $5 = $0;
 $6 = $0;
 $7 = (($6) + 308|0);
 $8 = $2;
 _cVar_onMessage($5,$7,0,$8,20);
 STACKTOP = sp;return;
}
function _cLoadbang_UcSVL_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $0;
 $5 = (($4) + 324|0);
 $6 = $2;
 _cVar_onMessage($3,$5,0,$6,21);
 STACKTOP = sp;return;
}
function _cLoadbang_yDIU9_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $2;
 _cMsg_9cFaP_sendMessage($3,0,$4);
 $5 = $0;
 $6 = $0;
 $7 = (($6) + 452|0);
 $8 = $2;
 _cVar_onMessage($5,$7,0,$8,22);
 $9 = $0;
 $10 = $0;
 $11 = (($10) + 460|0);
 $12 = $2;
 _cDelay_onMessage($9,$11,0,$12,23);
 STACKTOP = sp;return;
}
function _sZero_process($bOut) {
 $bOut = $bOut|0;
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $bOut;
 $1 = $0;
 HEAPF32[$1>>2] = 0.0;
 STACKTOP = sp;return;
}
function _mq_hasMessageBefore($q,$timestamp) {
 $q = $q|0;
 $timestamp = $timestamp|0;
 var $0 = 0, $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $q;
 $1 = $timestamp;
 $2 = $0;
 $3 = (_mq_hasMessage($2)|0);
 if (!($3)) {
  $10 = 0;
  STACKTOP = sp;return ($10|0);
 }
 $4 = $0;
 $5 = HEAP32[$4>>2]|0;
 $6 = (_mq_node_getMessage($5)|0);
 $7 = (_msg_getTimestamp67($6)|0);
 $8 = $1;
 $9 = ($7>>>0)<($8>>>0);
 $10 = $9;
 STACKTOP = sp;return ($10|0);
}
function _mq_peek($q) {
 $q = $q|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $q;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 STACKTOP = sp;return ($2|0);
}
function ___hv_tabread_f($o,$bOut) {
 $o = $o|0;
 $bOut = $bOut|0;
 var $0 = 0, $1 = 0, $10 = 0.0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $head = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $o;
 $1 = $bOut;
 $2 = $0;
 $3 = (($2) + 4|0);
 $4 = HEAP32[$3>>2]|0;
 $head = $4;
 $5 = $0;
 $6 = HEAP32[$5>>2]|0;
 $7 = (_hTable_getBuffer68($6)|0);
 $8 = $head;
 $9 = (($7) + ($8<<2)|0);
 $10 = +HEAPF32[$9>>2];
 $11 = $1;
 HEAPF32[$11>>2] = $10;
 $12 = $head;
 $13 = (($12) + 1)|0;
 $14 = $0;
 $15 = (($14) + 4|0);
 HEAP32[$15>>2] = $13;
 STACKTOP = sp;return;
}
function _sVarf_process($o,$bOut) {
 $o = $o|0;
 $bOut = $bOut|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0.0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $o;
 $1 = $bOut;
 $2 = $0;
 $3 = +HEAPF32[$2>>2];
 $4 = $1;
 HEAPF32[$4>>2] = $3;
 STACKTOP = sp;return;
}
function _sBiquad_k_process($o,$bIn,$bOut) {
 $o = $o|0;
 $bIn = +$bIn;
 $bOut = $bOut|0;
 var $0 = 0, $1 = 0.0, $10 = 0.0, $11 = 0, $12 = 0.0, $13 = 0.0, $14 = 0.0, $15 = 0, $16 = 0, $17 = 0.0, $18 = 0, $19 = 0, $2 = 0, $20 = 0.0, $21 = 0.0, $22 = 0.0, $23 = 0, $24 = 0, $25 = 0.0, $26 = 0;
 var $27 = 0, $28 = 0.0, $29 = 0.0, $3 = 0, $30 = 0.0, $31 = 0, $32 = 0, $33 = 0.0, $34 = 0, $35 = 0, $36 = 0.0, $37 = 0.0, $38 = 0.0, $39 = 0, $4 = 0, $40 = 0.0, $41 = 0, $42 = 0, $43 = 0.0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0.0, $48 = 0, $49 = 0, $5 = 0.0, $50 = 0.0, $51 = 0, $52 = 0, $53 = 0.0, $54 = 0, $6 = 0.0, $7 = 0.0, $8 = 0, $9 = 0, $y = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $o;
 $1 = $bIn;
 $2 = $bOut;
 $3 = $0;
 $4 = (($3) + 16|0);
 $5 = +HEAPF32[$4>>2];
 $6 = $1;
 $7 = $5 * $6;
 $8 = $0;
 $9 = (($8) + 20|0);
 $10 = +HEAPF32[$9>>2];
 $11 = $0;
 $12 = +HEAPF32[$11>>2];
 $13 = $10 * $12;
 $14 = $7 + $13;
 $15 = $0;
 $16 = (($15) + 24|0);
 $17 = +HEAPF32[$16>>2];
 $18 = $0;
 $19 = (($18) + 4|0);
 $20 = +HEAPF32[$19>>2];
 $21 = $17 * $20;
 $22 = $14 + $21;
 $23 = $0;
 $24 = (($23) + 28|0);
 $25 = +HEAPF32[$24>>2];
 $26 = $0;
 $27 = (($26) + 8|0);
 $28 = +HEAPF32[$27>>2];
 $29 = $25 * $28;
 $30 = $22 - $29;
 $31 = $0;
 $32 = (($31) + 32|0);
 $33 = +HEAPF32[$32>>2];
 $34 = $0;
 $35 = (($34) + 12|0);
 $36 = +HEAPF32[$35>>2];
 $37 = $33 * $36;
 $38 = $30 - $37;
 $y = $38;
 $39 = $0;
 $40 = +HEAPF32[$39>>2];
 $41 = $0;
 $42 = (($41) + 4|0);
 HEAPF32[$42>>2] = $40;
 $43 = $1;
 $44 = $0;
 HEAPF32[$44>>2] = $43;
 $45 = $0;
 $46 = (($45) + 8|0);
 $47 = +HEAPF32[$46>>2];
 $48 = $0;
 $49 = (($48) + 12|0);
 HEAPF32[$49>>2] = $47;
 $50 = $y;
 $51 = $0;
 $52 = (($51) + 8|0);
 HEAPF32[$52>>2] = $50;
 $53 = $y;
 $54 = $2;
 HEAPF32[$54>>2] = $53;
 STACKTOP = sp;return;
}
function ___hv_mul_f($bIn0,$bIn1,$bOut) {
 $bIn0 = +$bIn0;
 $bIn1 = +$bIn1;
 $bOut = $bOut|0;
 var $0 = 0.0, $1 = 0.0, $2 = 0, $3 = 0.0, $4 = 0.0, $5 = 0.0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $bIn0;
 $1 = $bIn1;
 $2 = $bOut;
 $3 = $0;
 $4 = $1;
 $5 = $3 * $4;
 $6 = $2;
 HEAPF32[$6>>2] = $5;
 STACKTOP = sp;return;
}
function ___hv_phasor_k_f($o,$bOut) {
 $o = $o|0;
 $bOut = $bOut|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0.0, $7 = 0.0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $o;
 $1 = $bOut;
 $2 = $0;
 $3 = (($2) + 4|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = $4 >>> 9;
 $6 = (+($5>>>0));
 $7 = $6 * 1.1920930376163597E-7;
 $8 = $1;
 HEAPF32[$8>>2] = $7;
 $9 = $0;
 $10 = (($9) + 8|0);
 $11 = HEAP32[$10>>2]|0;
 $12 = $0;
 $13 = (($12) + 4|0);
 $14 = HEAP32[$13>>2]|0;
 $15 = (($14) + ($11))|0;
 HEAP32[$13>>2] = $15;
 STACKTOP = sp;return;
}
function ___hv_sub_f($bIn0,$bIn1,$bOut) {
 $bIn0 = +$bIn0;
 $bIn1 = +$bIn1;
 $bOut = $bOut|0;
 var $0 = 0.0, $1 = 0.0, $2 = 0, $3 = 0.0, $4 = 0.0, $5 = 0.0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $bIn0;
 $1 = $bIn1;
 $2 = $bOut;
 $3 = $0;
 $4 = $1;
 $5 = $3 - $4;
 $6 = $2;
 HEAPF32[$6>>2] = $5;
 STACKTOP = sp;return;
}
function ___hv_abs_f($bIn,$bOut) {
 $bIn = +$bIn;
 $bOut = $bOut|0;
 var $0 = 0.0, $1 = 0, $2 = 0.0, $3 = 0.0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $bIn;
 $1 = $bOut;
 $2 = $0;
 $3 = (+Math_abs((+$2)));
 $4 = $1;
 HEAPF32[$4>>2] = $3;
 STACKTOP = sp;return;
}
function ___hv_add_f($bIn0,$bIn1,$bOut) {
 $bIn0 = +$bIn0;
 $bIn1 = +$bIn1;
 $bOut = $bOut|0;
 var $0 = 0.0, $1 = 0.0, $2 = 0, $3 = 0.0, $4 = 0.0, $5 = 0.0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $bIn0;
 $1 = $bIn1;
 $2 = $bOut;
 $3 = $0;
 $4 = $1;
 $5 = $3 + $4;
 $6 = $2;
 HEAPF32[$6>>2] = $5;
 STACKTOP = sp;return;
}
function ___hv_min_f($bIn0,$bIn1,$bOut) {
 $bIn0 = +$bIn0;
 $bIn1 = +$bIn1;
 $bOut = $bOut|0;
 var $0 = 0.0, $1 = 0.0, $2 = 0, $3 = 0.0, $4 = 0.0, $5 = 0.0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $bIn0;
 $1 = $bIn1;
 $2 = $bOut;
 $3 = $0;
 $4 = $1;
 $5 = (+_fminf($3,$4));
 $6 = $2;
 HEAPF32[$6>>2] = $5;
 STACKTOP = sp;return;
}
function ___hv_max_f($bIn0,$bIn1,$bOut) {
 $bIn0 = +$bIn0;
 $bIn1 = +$bIn1;
 $bOut = $bOut|0;
 var $0 = 0.0, $1 = 0.0, $2 = 0, $3 = 0.0, $4 = 0.0, $5 = 0.0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $bIn0;
 $1 = $bIn1;
 $2 = $bOut;
 $3 = $0;
 $4 = $1;
 $5 = (+_fmaxf($3,$4));
 $6 = $2;
 HEAPF32[$6>>2] = $5;
 STACKTOP = sp;return;
}
function ___hv_tabwrite_f($o,$bIn) {
 $o = $o|0;
 $bIn = +$bIn;
 var $0 = 0, $1 = 0.0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0.0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $head = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $o;
 $1 = $bIn;
 $2 = $0;
 $3 = (($2) + 4|0);
 $4 = HEAP32[$3>>2]|0;
 $head = $4;
 $5 = $1;
 $6 = $0;
 $7 = HEAP32[$6>>2]|0;
 $8 = (_hTable_getBuffer68($7)|0);
 $9 = $head;
 $10 = (($8) + ($9<<2)|0);
 HEAPF32[$10>>2] = $5;
 $11 = $head;
 $12 = (($11) + 1)|0;
 $13 = $0;
 $14 = (($13) + 4|0);
 HEAP32[$14>>2] = $12;
 STACKTOP = sp;return;
}
function _sStore_process($bOut,$bIn) {
 $bOut = $bOut|0;
 $bIn = +$bIn;
 var $0 = 0, $1 = 0.0, $2 = 0.0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $bOut;
 $1 = $bIn;
 $2 = $1;
 $3 = $0;
 HEAPF32[$3>>2] = $2;
 STACKTOP = sp;return;
}
function _ctx_getNumInputChannels65($_c) {
 $_c = $_c|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 STACKTOP = sp;return ($2|0);
}
function _ctx_getNumOutputChannels66($_c) {
 $_c = $_c|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $0;
 $2 = (($1) + 4|0);
 $3 = HEAP32[$2>>2]|0;
 STACKTOP = sp;return ($3|0);
}
function _cReceive_rmVuH_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $2;
 _cBinop_k_onMessage($3,0,2,500.0,0,$4,24);
 STACKTOP = sp;return;
}
function _cReceive_1to7Z_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $2;
 _cBinop_k_onMessage($3,0,2,300.0,0,$4,25);
 STACKTOP = sp;return;
}
function _cReceive_aFSFc_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $2;
 _cBinop_k_onMessage($3,0,2,20.0,0,$4,26);
 STACKTOP = sp;return;
}
function _cReceive_ATels_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $2;
 _cBinop_k_onMessage($3,0,21,0.89999997615814208,0,$4,27);
 STACKTOP = sp;return;
}
function _cMsg_6RzG2_sendMessage($_c,$letIn,$n) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $n = $n|0;
 var $0 = 0, $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $m = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $n;
 $m = 0;
 $3 = (_msg_getByteSize63(1)|0);
 $4 = STACKTOP; STACKTOP = STACKTOP + ((((1*$3)|0)+15)&-16)|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();;
 $m = $4;
 $5 = $m;
 $6 = $2;
 $7 = (_msg_getTimestamp67($6)|0);
 (_msg_init($5,1,$7)|0);
 $8 = $m;
 _msg_setSymbol69($8,0,472);
 $9 = $0;
 $10 = $m;
 _cSystem_onMessage($9,0,0,$10,28);
 STACKTOP = sp;return;
}
function _cSwitchcase_ltczC_onMessage($_c,$o,$letIn,$m,$sendMessage) {
 $_c = $_c|0;
 $o = $o|0;
 $letIn = $letIn|0;
 $m = $m|0;
 $sendMessage = $sendMessage|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $o;
 $2 = $letIn;
 $3 = $m;
 $4 = $sendMessage;
 $5 = $3;
 $6 = (_msg_getHash($5,0)|0);
 if ((($6|0) == 0)) {
  $7 = $0;
  $8 = $3;
  _cMsg_uyklC_sendMessage($7,0,$8);
  STACKTOP = sp;return;
 } else if ((($6|0) == 2052784941)) {
  $9 = $0;
  $10 = $3;
  _cMsg_uyklC_sendMessage($9,0,$10);
  STACKTOP = sp;return;
 } else {
  $11 = $0;
  $12 = $3;
  _cCast_onMessage($11,0,0,$12,29);
  $13 = $0;
  $14 = $3;
  _cCast_onMessage($13,0,0,$14,30);
  STACKTOP = sp;return;
 }
}
function _cMsg_BLdyD_sendMessage($_c,$letIn,$n) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $n = $n|0;
 var $0 = 0, $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $m = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $n;
 $m = 0;
 $3 = (_msg_getByteSize63(1)|0);
 $4 = STACKTOP; STACKTOP = STACKTOP + ((((1*$3)|0)+15)&-16)|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();;
 $m = $4;
 $5 = $m;
 $6 = $2;
 $7 = (_msg_getTimestamp67($6)|0);
 (_msg_init($5,1,$7)|0);
 $8 = $m;
 _msg_setSymbol69($8,0,472);
 $9 = $0;
 $10 = $m;
 _cSystem_onMessage($9,0,0,$10,31);
 STACKTOP = sp;return;
}
function _cVar_O4BBK_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $2;
 _cBinop_k_onMessage($3,0,2,6.2831897735595703,0,$4,32);
 STACKTOP = sp;return;
}
function _cVar_mA6px_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $2;
 _cBinop_k_onMessage($3,0,0,0.75,0,$4,33);
 STACKTOP = sp;return;
}
function _cMsg_Fstr9_sendMessage($_c,$letIn,$n) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $n = $n|0;
 var $0 = 0, $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $m = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $n;
 $m = 0;
 $3 = (_msg_getByteSize63(1)|0);
 $4 = STACKTOP; STACKTOP = STACKTOP + ((((1*$3)|0)+15)&-16)|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();;
 $m = $4;
 $5 = $m;
 $6 = $2;
 $7 = (_msg_getTimestamp67($6)|0);
 (_msg_init($5,1,$7)|0);
 $8 = $m;
 _msg_setSymbol69($8,0,472);
 $9 = $0;
 $10 = $m;
 _cSystem_onMessage($9,0,0,$10,34);
 STACKTOP = sp;return;
}
function _cVar_siNyy_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $2;
 _cBinop_k_onMessage($3,0,2,6.2831897735595703,0,$4,35);
 STACKTOP = sp;return;
}
function _cVar_yIPzC_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $2;
 _cBinop_k_onMessage($3,0,0,0.75,0,$4,36);
 STACKTOP = sp;return;
}
function _cMsg_9cFaP_sendMessage($_c,$letIn,$n) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $n = $n|0;
 var $0 = 0, $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $m = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $n;
 $m = 0;
 $3 = (_msg_getByteSize63(1)|0);
 $4 = STACKTOP; STACKTOP = STACKTOP + ((((1*$3)|0)+15)&-16)|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();;
 $m = $4;
 $5 = $m;
 $6 = $2;
 $7 = (_msg_getTimestamp67($6)|0);
 (_msg_init($5,1,$7)|0);
 $8 = $m;
 _msg_setSymbol69($8,0,472);
 $9 = $0;
 $10 = $m;
 _cSystem_onMessage($9,0,0,$10,37);
 STACKTOP = sp;return;
}
function _cVar_JsudP_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $2;
 _cMsg_J1GpD_sendMessage($3,0,$4);
 STACKTOP = sp;return;
}
function _cDelay_4PipT_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $2;
 _cSwitchcase_YfByx_onMessage($3,0,0,$4,0);
 STACKTOP = sp;return;
}
function _mq_hasMessage($q) {
 $q = $q|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $q;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 $3 = ($2|0)!=(0|0);
 STACKTOP = sp;return ($3|0);
}
function _mq_node_getMessage($n) {
 $n = $n|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $n;
 $1 = $0;
 $2 = (($1) + 12|0);
 $3 = HEAP32[$2>>2]|0;
 STACKTOP = sp;return ($3|0);
}
function _msg_getTimestamp67($m) {
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 STACKTOP = sp;return ($2|0);
}
function _hTable_getBuffer68($o) {
 $o = $o|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $o;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 STACKTOP = sp;return ($2|0);
}
function _cBinop_o98E7_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $2;
 _cBinop_k_onMessage($3,0,0,100.0,0,$4,38);
 STACKTOP = sp;return;
}
function _cBinop_fxOmb_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $2;
 _cBinop_k_onMessage($3,0,20,5.0,0,$4,39);
 STACKTOP = sp;return;
}
function _cBinop_BUZ0n_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $0;
 $5 = (($4) + 168|0);
 $6 = $2;
 _sPhasor_k_onMessage($3,$5,0,$6);
 STACKTOP = sp;return;
}
function _cBinop_QCJvl_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $0;
 $5 = (($4) + 116|0);
 $6 = $2;
 _sVarf_onMessage($3,$5,$6);
 STACKTOP = sp;return;
}
function _msg_setSymbol69($m,$index,$s) {
 $m = $m|0;
 $index = $index|0;
 $s = $s|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $s;
 $3 = $0;
 $4 = (($3) + 8|0);
 $5 = $1;
 $6 = (($4) + ($5<<3)|0);
 HEAP32[$6>>2] = 2;
 $7 = $2;
 $8 = $0;
 $9 = (($8) + 8|0);
 $10 = $1;
 $11 = (($9) + ($10<<3)|0);
 $12 = (($11) + 4|0);
 HEAP32[$12>>2] = $7;
 STACKTOP = sp;return;
}
function _cSystem_71nds_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $2;
 _cBinop_k_onMessage($3,0,3,1000.0,0,$4,40);
 STACKTOP = sp;return;
}
function _cMsg_uyklC_sendMessage($_c,$letIn,$n) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $n = $n|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $m = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $n;
 $m = 0;
 $3 = (_msg_getByteSize63(1)|0);
 $4 = STACKTOP; STACKTOP = STACKTOP + ((((1*$3)|0)+15)&-16)|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();;
 $m = $4;
 $5 = $m;
 $6 = $2;
 $7 = (_msg_getTimestamp67($6)|0);
 (_msg_init($5,1,$7)|0);
 $8 = $m;
 _msg_setSymbol69($8,0,448);
 $9 = $0;
 $10 = $0;
 $11 = (($10) + 340|0);
 $12 = $m;
 _cDelay_onMessage($9,$11,0,$12,41);
 STACKTOP = sp;return;
}
function _cCast_gZfDf_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $0;
 $5 = (($4) + 224|0);
 $6 = $2;
 _sTabwrite_onMessage($3,$5,1,$6,0);
 STACKTOP = sp;return;
}
function _cCast_ijWWE_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $2;
 _cCast_onMessage($3,0,0,$4,42);
 STACKTOP = sp;return;
}
function _cSystem_KgCjQ_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $0;
 $5 = (($4) + 236|0);
 $6 = $2;
 _cBinop_onMessage($3,$5,3,1,$6,43);
 STACKTOP = sp;return;
}
function _cBinop_gYRiw_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $0;
 $5 = (($4) + 236|0);
 $6 = $2;
 _cBinop_onMessage($3,$5,3,0,$6,43);
 STACKTOP = sp;return;
}
function _cBinop_AOmhv_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $0;
 $5 = (($4) + 168|0);
 $6 = $2;
 _sPhasor_k_onMessage($3,$5,1,$6);
 STACKTOP = sp;return;
}
function _cSystem_piVzj_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $0;
 $5 = (($4) + 296|0);
 $6 = $2;
 _cBinop_onMessage($3,$5,3,1,$6,44);
 STACKTOP = sp;return;
}
function _cBinop_Xe9Co_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $0;
 $5 = (($4) + 296|0);
 $6 = $2;
 _cBinop_onMessage($3,$5,3,0,$6,44);
 STACKTOP = sp;return;
}
function _cBinop_tzUsk_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $0;
 $5 = (($4) + 156|0);
 $6 = $2;
 _sPhasor_k_onMessage($3,$5,1,$6);
 STACKTOP = sp;return;
}
function _cSystem_H6gkV_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $2;
 _cBinop_k_onMessage($3,0,3,1000.0,0,$4,45);
 STACKTOP = sp;return;
}
function _cMsg_J1GpD_sendMessage($_c,$letIn,$n) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $n = $n|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $m = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $n;
 $m = 0;
 $3 = (_msg_getByteSize63(3)|0);
 $4 = STACKTOP; STACKTOP = STACKTOP + ((((1*$3)|0)+15)&-16)|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();;
 $m = $4;
 $5 = $m;
 $6 = $2;
 $7 = (_msg_getTimestamp67($6)|0);
 (_msg_init($5,3,$7)|0);
 $8 = $m;
 _msg_setSymbol69($8,0,456);
 $9 = $m;
 $10 = $2;
 _msg_setElementToFrom($9,1,$10,0);
 $11 = $m;
 _msg_setSymbol69($11,2,464);
 $12 = $0;
 $13 = $m;
 _cSystem_onMessage($12,0,0,$13,46);
 STACKTOP = sp;return;
}
function _cSwitchcase_YfByx_onMessage($_c,$o,$letIn,$m,$sendMessage) {
 $_c = $_c|0;
 $o = $o|0;
 $letIn = $letIn|0;
 $m = $m|0;
 $sendMessage = $sendMessage|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $o;
 $2 = $letIn;
 $3 = $m;
 $4 = $sendMessage;
 $5 = $3;
 $6 = (_msg_getHash($5,0)|0);
 if ((($6|0) == 0)) {
  $7 = $0;
  $8 = $3;
  _cMsg_0gu1I_sendMessage($7,0,$8);
  STACKTOP = sp;return;
 } else if ((($6|0) == 2052784941)) {
  $9 = $0;
  $10 = $3;
  _cMsg_0gu1I_sendMessage($9,0,$10);
  STACKTOP = sp;return;
 } else {
  $11 = $0;
  $12 = $3;
  _cCast_onMessage($11,0,0,$12,47);
  $13 = $0;
  $14 = $3;
  _cCast_onMessage($13,0,0,$14,48);
  STACKTOP = sp;return;
 }
}
function _cBinop_nU7GI_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $0;
 $5 = (($4) + 156|0);
 $6 = $2;
 _sPhasor_k_onMessage($3,$5,0,$6);
 STACKTOP = sp;return;
}
function _cBinop_D2EVx_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $2;
 _cBinop_k_onMessage($3,0,2,6.2831897735595703,0,$4,35);
 STACKTOP = sp;return;
}
function _cBinop_ahmg6_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $2;
 _cBinop_k_onMessage($3,0,2,200.0,0,$4,49);
 STACKTOP = sp;return;
}
function _cDelay_szhkK_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $0;
 $5 = (($4) + 224|0);
 $6 = $2;
 _sTabwrite_onMessage($3,$5,1,$6,0);
 $7 = $0;
 $8 = $2;
 _cCast_onMessage($7,0,0,$8,42);
 STACKTOP = sp;return;
}
function _cCast_gJHmq_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $0;
 $5 = (($4) + 340|0);
 $6 = $2;
 _cDelay_onMessage($3,$5,0,$6,41);
 STACKTOP = sp;return;
}
function _cBinop_OBm8I_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $2;
 _cBinop_k_onMessage($3,0,20,0.0,0,$4,50);
 STACKTOP = sp;return;
}
function _cBinop_xAxNs_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $2;
 _cBinop_k_onMessage($3,0,20,0.0,0,$4,51);
 STACKTOP = sp;return;
}
function _cBinop_FHXYv_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $0;
 $5 = (($4) + 404|0);
 $6 = $2;
 _cBinop_onMessage($3,$5,2,0,$6,52);
 $7 = $0;
 $8 = $0;
 $9 = (($8) + 400|0);
 $10 = $2;
 _cBinop_onMessage($7,$9,3,1,$10,53);
 STACKTOP = sp;return;
}
function _cSystem_UL0PS_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $0;
 $5 = (($4) + 500|0);
 $6 = $2;
 _cBinop_onMessage($3,$5,1,0,$6,54);
 $7 = $0;
 $8 = $0;
 $9 = (($8) + 400|0);
 $10 = $2;
 _cBinop_onMessage($7,$9,3,0,$10,53);
 STACKTOP = sp;return;
}
function _cMsg_0gu1I_sendMessage($_c,$letIn,$n) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $n = $n|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $m = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $n;
 $m = 0;
 $3 = (_msg_getByteSize63(1)|0);
 $4 = STACKTOP; STACKTOP = STACKTOP + ((((1*$3)|0)+15)&-16)|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();;
 $m = $4;
 $5 = $m;
 $6 = $2;
 $7 = (_msg_getTimestamp67($6)|0);
 (_msg_init($5,1,$7)|0);
 $8 = $m;
 _msg_setSymbol69($8,0,448);
 $9 = $0;
 $10 = $0;
 $11 = (($10) + 408|0);
 $12 = $m;
 _cDelay_onMessage($9,$11,0,$12,55);
 STACKTOP = sp;return;
}
function _cCast_JJFHy_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $0;
 $5 = (($4) + 104|0);
 $6 = $2;
 _sTabread_onMessage($3,$5,0,$6);
 STACKTOP = sp;return;
}
function _cCast_G0DRb_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $2;
 _cCast_onMessage($3,0,0,$4,56);
 STACKTOP = sp;return;
}
function _cBinop_urR3C_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $2;
 _cMsg_77DJl_sendMessage($3,0,$4);
 STACKTOP = sp;return;
}
function _cBinop_GV5ig_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $2;
 _cBinop_k_onMessage($3,0,21,1.0,0,$4,57);
 STACKTOP = sp;return;
}
function _cBinop_h0TZk_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $2;
 _cBinop_k_onMessage($3,0,21,1.0,0,$4,58);
 STACKTOP = sp;return;
}
function _cBinop_jRgn1_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $0;
 $5 = (($4) + 500|0);
 $6 = $2;
 _cBinop_onMessage($3,$5,1,1,$6,54);
 STACKTOP = sp;return;
}
function _cBinop_0FW8Y_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $0;
 $5 = (($4) + 408|0);
 $6 = $2;
 _cDelay_onMessage($3,$5,1,$6,55);
 STACKTOP = sp;return;
}
function _cBinop_YZuof_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $0;
 $5 = (($4) + 104|0);
 $6 = $2;
 _sTabread_onMessage($3,$5,0,$6);
 STACKTOP = sp;return;
}
function _cDelay_3Ix66_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $0;
 $5 = (($4) + 104|0);
 $6 = $2;
 _sTabread_onMessage($3,$5,0,$6);
 $7 = $0;
 $8 = $2;
 _cCast_onMessage($7,0,0,$8,56);
 STACKTOP = sp;return;
}
function _cCast_PxKCb_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $0;
 $5 = (($4) + 408|0);
 $6 = $2;
 _cDelay_onMessage($3,$5,0,$6,55);
 STACKTOP = sp;return;
}
function _cMsg_77DJl_sendMessage($_c,$letIn,$n) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $n = $n|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $m = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $n;
 $m = 0;
 $3 = (_msg_getByteSize63(2)|0);
 $4 = STACKTOP; STACKTOP = STACKTOP + ((((1*$3)|0)+15)&-16)|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();;
 $m = $4;
 $5 = $m;
 $6 = $2;
 $7 = (_msg_getTimestamp67($6)|0);
 (_msg_init($5,2,$7)|0);
 $8 = $m;
 _msg_setSymbol69($8,0,488);
 $9 = $m;
 $10 = $2;
 _msg_setElementToFrom($9,1,$10,0);
 $11 = $0;
 $12 = (($11) + 380|0);
 $13 = $m;
 _hTable_onMessage($12,0,$13);
 STACKTOP = sp;return;
}
function _cBinop_MRaB2_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $2;
 _cBinop_k_onMessage($3,0,1,1.0,0,$4,59);
 $5 = $0;
 $6 = (($5) + 120|0);
 $7 = $2;
 _sBiquad_k_onMessage($6,1,$7);
 STACKTOP = sp;return;
}
function _cBinop_e6eAx_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = $2;
 _cBinop_k_onMessage($3,0,1,1.0,0,$4,60);
 $5 = $0;
 $6 = (($5) + 188|0);
 $7 = $2;
 _sBiquad_k_onMessage($6,1,$7);
 STACKTOP = sp;return;
}
function _cBinop_g1ABT_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = (($3) + 120|0);
 $5 = $2;
 _sBiquad_k_onMessage($4,4,$5);
 STACKTOP = sp;return;
}
function _cBinop_f7il4_sendMessage($_c,$letIn,$m) {
 $_c = $_c|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $letIn;
 $2 = $m;
 $3 = $0;
 $4 = (($3) + 188|0);
 $5 = $2;
 _sBiquad_k_onMessage($4,4,$5);
 STACKTOP = sp;return;
}
function _msg_init($m,$numElements,$timestamp) {
 $m = $m|0;
 $numElements = $numElements|0;
 $timestamp = $timestamp|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $numElements;
 $2 = $timestamp;
 $3 = $2;
 $4 = $0;
 HEAP32[$4>>2] = $3;
 $5 = $1;
 $6 = $5&65535;
 $7 = $0;
 $8 = (($7) + 4|0);
 HEAP16[$8>>1] = $6;
 $9 = $1;
 $10 = (_msg_getByteSize107($9)|0);
 $11 = $10&65535;
 $12 = $0;
 $13 = (($12) + 6|0);
 HEAP16[$13>>1] = $11;
 $14 = $0;
 STACKTOP = sp;return ($14|0);
}
function _msg_initWithFloat($m,$timestamp,$f) {
 $m = $m|0;
 $timestamp = $timestamp|0;
 $f = +$f;
 var $0 = 0, $1 = 0, $10 = 0.0, $11 = 0, $2 = 0.0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $timestamp;
 $2 = $f;
 $3 = $1;
 $4 = $0;
 HEAP32[$4>>2] = $3;
 $5 = $0;
 $6 = (($5) + 4|0);
 HEAP16[$6>>1] = 1;
 $7 = $0;
 $8 = (($7) + 6|0);
 HEAP16[$8>>1] = 16;
 $9 = $0;
 $10 = $2;
 _msg_setFloat108($9,0,$10);
 $11 = $0;
 STACKTOP = sp;return ($11|0);
}
function _msg_initWithBang($m,$timestamp) {
 $m = $m|0;
 $timestamp = $timestamp|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $timestamp;
 $2 = $1;
 $3 = $0;
 HEAP32[$3>>2] = $2;
 $4 = $0;
 $5 = (($4) + 4|0);
 HEAP16[$5>>1] = 1;
 $6 = $0;
 $7 = (($6) + 6|0);
 HEAP16[$7>>1] = 16;
 $8 = $0;
 _msg_setBang109($8,0);
 $9 = $0;
 STACKTOP = sp;return ($9|0);
}
function _msg_initWithSymbol($m,$timestamp,$s) {
 $m = $m|0;
 $timestamp = $timestamp|0;
 $s = $s|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $timestamp;
 $2 = $s;
 $3 = $1;
 $4 = $0;
 HEAP32[$4>>2] = $3;
 $5 = $0;
 $6 = (($5) + 4|0);
 HEAP16[$6>>1] = 1;
 $7 = $0;
 $8 = (($7) + 6|0);
 HEAP16[$8>>1] = 16;
 $9 = $0;
 $10 = $2;
 _msg_setSymbol110($9,0,$10);
 $11 = $0;
 STACKTOP = sp;return ($11|0);
}
function _msg_initWithHash($m,$timestamp,$h) {
 $m = $m|0;
 $timestamp = $timestamp|0;
 $h = $h|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $timestamp;
 $2 = $h;
 $3 = $1;
 $4 = $0;
 HEAP32[$4>>2] = $3;
 $5 = $0;
 $6 = (($5) + 4|0);
 HEAP16[$6>>1] = 1;
 $7 = $0;
 $8 = (($7) + 6|0);
 HEAP16[$8>>1] = 16;
 $9 = $0;
 $10 = $2;
 _msg_setHash($9,0,$10);
 $11 = $0;
 STACKTOP = sp;return ($11|0);
}
function _msg_getNumHeapBytes($m) {
 $m = $m|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0;
 var $7 = 0, $8 = 0, $9 = 0, $i = 0, $rsizeofsym = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $rsizeofsym = 0;
 $i = 0;
 while(1) {
  $1 = $i;
  $2 = $0;
  $3 = (_msg_getNumElements111($2)|0);
  $4 = ($1|0)<($3|0);
  if (!($4)) {
   break;
  }
  $5 = $0;
  $6 = $i;
  $7 = (_msg_isSymbol112($5,$6)|0);
  $8 = ($7|0)!=(0);
  if ($8) {
   $9 = $0;
   $10 = $i;
   $11 = (_msg_getSymbol113($9,$10)|0);
   $12 = (_strlen(($11|0))|0);
   $13 = (($12) + 1)|0;
   $14 = $rsizeofsym;
   $15 = (($14) + ($13))|0;
   $rsizeofsym = $15;
  }
  $16 = $i;
  $17 = (($16) + 1)|0;
  $i = $17;
 }
 $18 = $0;
 $19 = (_msg_getNumElements111($18)|0);
 $20 = (_msg_getByteSize107($19)|0);
 $21 = $rsizeofsym;
 $22 = (($20) + ($21))|0;
 STACKTOP = sp;return ($22|0);
}
function _msg_copyToBuffer($m,$buffer,$len) {
 $m = $m|0;
 $buffer = $buffer|0;
 $len = $len|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i = 0, $len_r = 0, $p = 0;
 var $r = 0, $symLen = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $buffer;
 $2 = $len;
 $3 = $1;
 $r = $3;
 $4 = $0;
 $5 = (_msg_getNumBytes($4)|0);
 $6 = $2;
 $7 = ($5>>>0)<=($6>>>0);
 if (!($7)) {
  ___assert_fail((552|0),(584|0),102,(608|0));
  // unreachable;
 }
 $8 = $r;
 $9 = $0;
 $10 = $0;
 $11 = (_msg_getNumBytes($10)|0);
 _memcpy(($8|0),($9|0),($11|0))|0;
 $12 = $0;
 $13 = (_msg_getNumBytes($12)|0);
 $len_r = $13;
 $14 = $1;
 $15 = $0;
 $16 = (_msg_getNumElements111($15)|0);
 $17 = (_msg_getByteSize107($16)|0);
 $18 = (($14) + ($17)|0);
 $p = $18;
 $i = 0;
 while(1) {
  $19 = $i;
  $20 = $0;
  $21 = (_msg_getNumElements111($20)|0);
  $22 = ($19|0)<($21|0);
  if (!($22)) {
   label = 11;
   break;
  }
  $23 = $0;
  $24 = $i;
  $25 = (_msg_isSymbol112($23,$24)|0);
  $26 = ($25|0)!=(0);
  if ($26) {
   $27 = $0;
   $28 = $i;
   $29 = (_msg_getSymbol113($27,$28)|0);
   $30 = (_strlen(($29|0))|0);
   $31 = (($30) + 1)|0;
   $symLen = $31;
   $32 = $len_r;
   $33 = $symLen;
   $34 = (($32) + ($33))|0;
   $35 = $2;
   $36 = ($34>>>0)<=($35>>>0);
   if (!($36)) {
    label = 7;
    break;
   }
   $37 = $p;
   $38 = $0;
   $39 = $i;
   $40 = (_msg_getSymbol113($38,$39)|0);
   $41 = $symLen;
   (_strncpy(($37|0),($40|0),($41|0))|0);
   $42 = $r;
   $43 = $i;
   $44 = $p;
   _msg_setSymbol110($42,$43,$44);
   $45 = $symLen;
   $46 = $p;
   $47 = (($46) + ($45)|0);
   $p = $47;
   $48 = $symLen;
   $49 = $len_r;
   $50 = (($49) + ($48))|0;
   $len_r = $50;
  }
  $51 = $i;
  $52 = (($51) + 1)|0;
  $i = $52;
 }
 if ((label|0) == 7) {
  ___assert_fail((632|0),(584|0),113,(608|0));
  // unreachable;
 }
 else if ((label|0) == 11) {
  $53 = $len_r;
  $54 = $53&65535;
  $55 = $r;
  $56 = (($55) + 6|0);
  HEAP16[$56>>1] = $54;
  STACKTOP = sp;return;
 }
}
function _msg_compareSymbol($m,$i,$s) {
 $m = $m|0;
 $i = $i|0;
 $s = $s|0;
 var $$expand_i1_val = 0, $$expand_i1_val2 = 0, $$expand_i1_val4 = 0, $$pre_trunc = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $3 = 0, $4 = 0;
 var $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $m;
 $2 = $i;
 $3 = $s;
 $4 = $1;
 $5 = $2;
 $6 = (_msg_getType116($4,$5)|0);
 if ((($6|0) == 2)) {
  $7 = $1;
  $8 = $2;
  $9 = (_msg_getSymbol113($7,$8)|0);
  $10 = $3;
  $11 = (_strcmp($9,$10)|0);
  $12 = ($11|0)!=(0);
  $13 = $12 ^ 1;
  $$expand_i1_val = $13&1;
  $0 = $$expand_i1_val;
 } else if ((($6|0) == 3)) {
  $14 = $1;
  $15 = $2;
  $16 = (_msg_getHash($14,$15)|0);
  $17 = $3;
  $18 = (_msg_symbolToHash($17)|0);
  $19 = ($16|0)==($18|0);
  $$expand_i1_val2 = $19&1;
  $0 = $$expand_i1_val2;
 } else {
  $$expand_i1_val4 = 0;
  $0 = $$expand_i1_val4;
 }
 $$pre_trunc = $0;
 $20 = $$pre_trunc&1;
 STACKTOP = sp;return ($20|0);
}
function _msg_getHash($m,$i) {
 $m = $m|0;
 $i = $i|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0.0;
 var $9 = 0, $f = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $f = sp;
 $1 = $m;
 $2 = $i;
 $3 = $1;
 $4 = $2;
 $5 = (_msg_getType116($3,$4)|0);
 if ((($5|0) == 1)) {
  $6 = $1;
  $7 = $2;
  $8 = (+_msg_getFloat117($6,$7));
  HEAPF32[$f>>2] = $8;
  $9 = HEAP32[$f>>2]|0;
  $0 = $9;
 } else if ((($5|0) == 3)) {
  $14 = $1;
  $15 = (($14) + 8|0);
  $16 = $2;
  $17 = (($15) + ($16<<3)|0);
  $18 = (($17) + 4|0);
  $19 = HEAP32[$18>>2]|0;
  $0 = $19;
 } else if ((($5|0) == 2)) {
  $10 = $1;
  $11 = $2;
  $12 = (_msg_getSymbol113($10,$11)|0);
  $13 = (_msg_symbolToHash($12)|0);
  $0 = $13;
 } else if ((($5|0) == 0)) {
  $0 = -1;
 } else {
  $0 = 0;
 }
 $20 = $0;
 STACKTOP = sp;return ($20|0);
}
function _msg_symbolToHash($s) {
 $s = $s|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $k = 0, $len = 0;
 var $x = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $s;
 $1 = $0;
 $2 = (_strlen(($1|0))|0);
 $len = $2;
 $3 = $len;
 $x = $3;
 while(1) {
  $4 = $len;
  $5 = ($4|0)>=(4);
  if (!($5)) {
   break;
  }
  $6 = $0;
  $7 = HEAP32[$6>>2]|0;
  $k = $7;
  $8 = $k;
  $9 = Math_imul($8, 1540483477)|0;
  $k = $9;
  $10 = $k;
  $11 = $10 >>> 24;
  $12 = $k;
  $13 = $12 ^ $11;
  $k = $13;
  $14 = $k;
  $15 = Math_imul($14, 1540483477)|0;
  $k = $15;
  $16 = $x;
  $17 = Math_imul($16, 1540483477)|0;
  $x = $17;
  $18 = $k;
  $19 = $x;
  $20 = $19 ^ $18;
  $x = $20;
  $21 = $0;
  $22 = (($21) + 4|0);
  $0 = $22;
  $23 = $len;
  $24 = (($23) - 4)|0;
  $len = $24;
 }
 $25 = $len;
 if ((($25|0) == 1)) {
  label = 7;
 } else if ((($25|0) == 3)) {
  $26 = $0;
  $27 = (($26) + 2|0);
  $28 = HEAP8[$27>>0]|0;
  $29 = $28 << 24 >> 24;
  $30 = $29 << 16;
  $31 = $x;
  $32 = $31 ^ $30;
  $x = $32;
  label = 6;
 } else if ((($25|0) == 2)) {
  label = 6;
 }
 if ((label|0) == 6) {
  $33 = $0;
  $34 = (($33) + 1|0);
  $35 = HEAP8[$34>>0]|0;
  $36 = $35 << 24 >> 24;
  $37 = $36 << 8;
  $38 = $x;
  $39 = $38 ^ $37;
  $x = $39;
  label = 7;
 }
 if ((label|0) == 7) {
  $40 = $0;
  $41 = HEAP8[$40>>0]|0;
  $42 = $41 << 24 >> 24;
  $43 = $x;
  $44 = $43 ^ $42;
  $x = $44;
  $45 = $x;
  $46 = Math_imul($45, 1540483477)|0;
  $x = $46;
 }
 $47 = $x;
 $48 = $47 >>> 13;
 $49 = $x;
 $50 = $49 ^ $48;
 $x = $50;
 $51 = $x;
 $52 = Math_imul($51, 1540483477)|0;
 $x = $52;
 $53 = $x;
 $54 = $53 >>> 15;
 $55 = $x;
 $56 = $55 ^ $54;
 $x = $56;
 $57 = $x;
 STACKTOP = sp;return ($57|0);
}
function _msg_setElementToFrom($n,$i_n,$m,$i_m) {
 $n = $n|0;
 $i_n = $i_n|0;
 $m = $m|0;
 $i_m = $i_m|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0.0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $3 = 0, $4 = 0, $5 = 0;
 var $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $n;
 $1 = $i_n;
 $2 = $m;
 $3 = $i_m;
 $4 = $2;
 $5 = $3;
 $6 = (_msg_getType116($4,$5)|0);
 if ((($6|0) == 0)) {
  $7 = $0;
  $8 = $1;
  _msg_setBang109($7,$8);
  STACKTOP = sp;return;
 } else if ((($6|0) == 2)) {
  $14 = $0;
  $15 = $1;
  $16 = $2;
  $17 = $3;
  $18 = (_msg_getSymbol113($16,$17)|0);
  _msg_setSymbol110($14,$15,$18);
  STACKTOP = sp;return;
 } else if ((($6|0) == 3)) {
  $19 = $0;
  $20 = $1;
  $21 = $2;
  $22 = $3;
  $23 = (_msg_getHash($21,$22)|0);
  _msg_setHash($19,$20,$23);
 } else if ((($6|0) == 1)) {
  $9 = $0;
  $10 = $1;
  $11 = $2;
  $12 = $3;
  $13 = (+_msg_getFloat117($11,$12));
  _msg_setFloat108($9,$10,$13);
  STACKTOP = sp;return;
 }
 STACKTOP = sp;return;
}
function _msg_getByteSize107($numElements) {
 $numElements = $numElements|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $numElements;
 $1 = $0;
 $2 = ($1>>>0)>(0);
 if ($2) {
  $3 = $0;
  $4 = (($3) - 1)|0;
  $5 = $4<<3;
  $6 = (16 + ($5))|0;
  STACKTOP = sp;return ($6|0);
 } else {
  ___assert_fail((656|0),(672|0),56,(696|0));
  // unreachable;
 }
 return (0)|0;
}
function _msg_setFloat108($m,$index,$f) {
 $m = $m|0;
 $index = $index|0;
 $f = +$f;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0.0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0.0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $f;
 $3 = $0;
 $4 = (($3) + 8|0);
 $5 = $1;
 $6 = (($4) + ($5<<3)|0);
 HEAP32[$6>>2] = 1;
 $7 = $2;
 $8 = $0;
 $9 = (($8) + 8|0);
 $10 = $1;
 $11 = (($9) + ($10<<3)|0);
 $12 = (($11) + 4|0);
 HEAPF32[$12>>2] = $7;
 STACKTOP = sp;return;
}
function _msg_setBang109($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 HEAP32[$5>>2] = 0;
 $6 = $0;
 $7 = (($6) + 8|0);
 $8 = $1;
 $9 = (($7) + ($8<<3)|0);
 $10 = (($9) + 4|0);
 HEAP32[$10>>2] = 0;
 STACKTOP = sp;return;
}
function _msg_setSymbol110($m,$index,$s) {
 $m = $m|0;
 $index = $index|0;
 $s = $s|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $s;
 $3 = $0;
 $4 = (($3) + 8|0);
 $5 = $1;
 $6 = (($4) + ($5<<3)|0);
 HEAP32[$6>>2] = 2;
 $7 = $2;
 $8 = $0;
 $9 = (($8) + 8|0);
 $10 = $1;
 $11 = (($9) + ($10<<3)|0);
 $12 = (($11) + 4|0);
 HEAP32[$12>>2] = $7;
 STACKTOP = sp;return;
}
function _msg_setHash($m,$index,$h) {
 $m = $m|0;
 $index = $index|0;
 $h = $h|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $h;
 $3 = $0;
 $4 = (($3) + 8|0);
 $5 = $1;
 $6 = (($4) + ($5<<3)|0);
 HEAP32[$6>>2] = 3;
 $7 = $2;
 $8 = $0;
 $9 = (($8) + 8|0);
 $10 = $1;
 $11 = (($9) + ($10<<3)|0);
 $12 = (($11) + 4|0);
 HEAP32[$12>>2] = $7;
 STACKTOP = sp;return;
}
function _msg_getNumElements111($m) {
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $0;
 $2 = (($1) + 4|0);
 $3 = HEAP16[$2>>1]|0;
 $4 = $3&65535;
 STACKTOP = sp;return ($4|0);
}
function _msg_isSymbol112($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = ($6|0)==(2);
 $8 = $7&1;
 STACKTOP = sp;return ($8|0);
}
function _msg_getSymbol113($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = (($5) + 4|0);
 $7 = HEAP32[$6>>2]|0;
 STACKTOP = sp;return ($7|0);
}
function _msg_getNumBytes($m) {
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $0;
 $2 = (($1) + 6|0);
 $3 = HEAP16[$2>>1]|0;
 $4 = $3&65535;
 STACKTOP = sp;return ($4|0);
}
function _msg_getType116($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = HEAP32[$5>>2]|0;
 STACKTOP = sp;return ($6|0);
}
function _msg_getFloat117($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = (($5) + 4|0);
 $7 = +HEAPF32[$6>>2];
 STACKTOP = sp;return (+$7);
}
function _hTable_init($o,$length) {
 $o = $o|0;
 $length = $length|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $numBytes = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $o;
 $1 = $length;
 $2 = $1;
 $3 = $0;
 $4 = (($3) + 4|0);
 HEAP32[$4>>2] = $2;
 $5 = $1;
 $6 = $5 & 0;
 $7 = ($6|0)==(0);
 if ($7) {
  $8 = $1;
  $13 = $8;
 } else {
  $9 = $1;
  $10 = (($9) + 1)|0;
  $13 = $10;
 }
 $11 = $0;
 $12 = (($11) + 8|0);
 HEAP32[$12>>2] = $13;
 $14 = $0;
 $15 = (($14) + 12|0);
 HEAP32[$15>>2] = 0;
 $16 = $0;
 $17 = (($16) + 8|0);
 $18 = HEAP32[$17>>2]|0;
 $19 = $18<<2;
 $numBytes = $19;
 $20 = $numBytes;
 $21 = (_malloc($20)|0);
 $22 = $0;
 HEAP32[$22>>2] = $21;
 $23 = $0;
 $24 = HEAP32[$23>>2]|0;
 $25 = $0;
 $26 = (($25) + 8|0);
 $27 = HEAP32[$26>>2]|0;
 $28 = $27<<2;
 _memset(($24|0),0,($28|0))|0;
 $29 = $numBytes;
 STACKTOP = sp;return ($29|0);
}
function _hTable_free($o) {
 $o = $o|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $o;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 _free($2);
 STACKTOP = sp;return;
}
function _hTable_resize($o,$newLength) {
 $o = $o|0;
 $newLength = $newLength|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $8 = 0, $9 = 0, $b = 0, $c = 0, $min = 0;
 var $newBytes = 0, $newSize = 0, $oldBytes = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $o;
 $2 = $newLength;
 $3 = $1;
 $4 = (($3) + 8|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = $5<<2;
 $oldBytes = $6;
 $7 = $2;
 $8 = $7 & 0;
 $9 = ($8|0)==(0);
 if ($9) {
  $10 = $2;
  $13 = $10;
 } else {
  $11 = $2;
  $12 = (($11) + 1)|0;
  $13 = $12;
 }
 $newSize = $13;
 $14 = $newSize;
 $15 = $14<<2;
 $newBytes = $15;
 $16 = $1;
 $17 = HEAP32[$16>>2]|0;
 $18 = $newBytes;
 $19 = (_realloc($17,$18)|0);
 $b = $19;
 $20 = $b;
 $21 = ($20|0)==(0|0);
 if ($21) {
  $0 = 0;
  $76 = $0;
  STACKTOP = sp;return ($76|0);
 }
 $22 = $newSize;
 $23 = $1;
 $24 = (($23) + 8|0);
 $25 = HEAP32[$24>>2]|0;
 $26 = ($22>>>0)>($25>>>0);
 if ($26) {
  $27 = $b;
  $28 = $1;
  $29 = (($28) + 8|0);
  $30 = HEAP32[$29>>2]|0;
  $31 = (($27) + ($30<<2)|0);
  $32 = $newSize;
  $33 = $1;
  $34 = (($33) + 8|0);
  $35 = HEAP32[$34>>2]|0;
  $36 = $35<<2;
  $37 = (($32) - ($36))|0;
  _memset(($31|0),0,($37|0))|0;
 }
 $38 = $b;
 $39 = $1;
 $40 = HEAP32[$39>>2]|0;
 $41 = ($38|0)!=($40|0);
 if ($41) {
  $42 = $b;
  $43 = $42;
  $44 = $43 & 16;
  $45 = ($44|0)==(0);
  $46 = (0)==(0);
  $47 = $45 & $46;
  if ($47) {
   $48 = $b;
   $49 = $1;
   HEAP32[$49>>2] = $48;
  } else {
   $50 = $newBytes;
   $51 = (_malloc($50)|0);
   $c = $51;
   $52 = $c;
   $53 = $2;
   $54 = $53<<2;
   _memset(($52|0),0,($54|0))|0;
   $55 = $1;
   $56 = (($55) + 4|0);
   $57 = HEAP32[$56>>2]|0;
   $58 = $2;
   $59 = (_hv_min_ui($57,$58)|0);
   $min = $59;
   $60 = $c;
   $61 = $b;
   $62 = $min;
   $63 = $62<<2;
   _memcpy(($60|0),($61|0),($63|0))|0;
   $64 = $b;
   _free($64);
   $65 = $c;
   $66 = $1;
   HEAP32[$66>>2] = $65;
  }
 }
 $67 = $2;
 $68 = $1;
 $69 = (($68) + 4|0);
 HEAP32[$69>>2] = $67;
 $70 = $newSize;
 $71 = $1;
 $72 = (($71) + 8|0);
 HEAP32[$72>>2] = $70;
 $73 = $newBytes;
 $74 = $oldBytes;
 $75 = (($73) - ($74))|0;
 $0 = $75;
 $76 = $0;
 STACKTOP = sp;return ($76|0);
}
function _hTable_onMessage($o,$letIn,$m) {
 $o = $o|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0.0, $14 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $o;
 $1 = $letIn;
 $2 = $m;
 $3 = $2;
 $4 = (_msg_compareSymbol($3,0,712)|0);
 if ($4) {
  $5 = $2;
  $6 = (_msg_isFloat127($5,1)|0);
  $7 = ($6|0)!=(0);
  if ($7) {
   $8 = $2;
   $9 = (+_msg_getFloat128($8,1));
   $10 = $9 >= 0.0;
   if ($10) {
    $11 = $0;
    $12 = $2;
    $13 = (+_msg_getFloat128($12,1));
    $14 = (~~(($13)));
    (_hTable_resize($11,$14)|0);
   }
  }
 }
 STACKTOP = sp;return;
}
function _msg_isFloat127($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = ($6|0)==(1);
 $8 = $7&1;
 STACKTOP = sp;return ($8|0);
}
function _msg_getFloat128($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = (($5) + 4|0);
 $7 = +HEAPF32[$6>>2];
 STACKTOP = sp;return (+$7);
}
function _mp_init($mp,$numKB) {
 $mp = $mp|0;
 $numKB = $numKB|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $mp;
 $1 = $numKB;
 $2 = $1;
 $3 = $2<<10;
 $4 = $0;
 $5 = (($4) + 4|0);
 HEAP32[$5>>2] = $3;
 $6 = $0;
 $7 = (($6) + 4|0);
 $8 = HEAP32[$7>>2]|0;
 $9 = (_malloc($8)|0);
 $10 = $0;
 HEAP32[$10>>2] = $9;
 $11 = $0;
 $12 = (($11) + 8|0);
 HEAP32[$12>>2] = 0;
 $i = 0;
 while(1) {
  $13 = $i;
  $14 = ($13|0)<(4);
  if (!($14)) {
   break;
  }
  $15 = $i;
  $16 = $0;
  $17 = (($16) + 12|0);
  $18 = (($17) + ($15<<3)|0);
  HEAP32[$18>>2] = 0;
  $19 = $i;
  $20 = $0;
  $21 = (($20) + 12|0);
  $22 = (($21) + ($19<<3)|0);
  $23 = (($22) + 4|0);
  HEAP32[$23>>2] = 0;
  $24 = $i;
  $25 = (($24) + 1)|0;
  $i = $25;
 }
 $26 = $0;
 $27 = (($26) + 4|0);
 $28 = HEAP32[$27>>2]|0;
 STACKTOP = sp;return ($28|0);
}
function _mp_free($mp) {
 $mp = $mp|0;
 var $0 = 0, $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $mp;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 _free($2);
 $i = 0;
 while(1) {
  $3 = $i;
  $4 = ($3|0)<(4);
  if (!($4)) {
   break;
  }
  $5 = $i;
  $6 = $0;
  $7 = (($6) + 12|0);
  $8 = (($7) + ($5<<3)|0);
  _ml_free($8);
  $9 = $i;
  $10 = (($9) + 1)|0;
  $i = $10;
 }
 STACKTOP = sp;return;
}
function _mp_freeMessage($mp,$m) {
 $mp = $mp|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $b = 0, $chunkSize = 0, $i = 0, $ml = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $mp;
 $1 = $m;
 $2 = $1;
 $3 = (_msg_getNumBytes132($2)|0);
 $b = $3;
 $4 = $b;
 $5 = (_mp_messagelistIndexForSize($4)|0);
 $i = $5;
 $6 = $i;
 $7 = $0;
 $8 = (($7) + 12|0);
 $9 = (($8) + ($6<<3)|0);
 $ml = $9;
 $10 = $i;
 $11 = 32 << $10;
 $chunkSize = $11;
 $12 = $1;
 $13 = $chunkSize;
 _memset(($12|0),0,($13|0))|0;
 $14 = $ml;
 $15 = $1;
 _ml_push($14,$15);
 STACKTOP = sp;return;
}
function _mp_addMessage($mp,$m) {
 $mp = $mp|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $b = 0, $buf = 0, $buf2 = 0, $chunkSize = 0;
 var $i = 0, $i1 = 0, $ml = 0, $newIndex = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $mp;
 $2 = $m;
 $3 = $2;
 $4 = (_msg_getNumHeapBytes($3)|0);
 $b = $4;
 $5 = $b;
 $6 = (_mp_messagelistIndexForSize($5)|0);
 $i = $6;
 $7 = $i;
 $8 = ($7>>>0)<(4);
 if (!($8)) {
  ___assert_fail((720|0),(752|0),127,(776|0));
  // unreachable;
 }
 $9 = $i;
 $10 = $1;
 $11 = (($10) + 12|0);
 $12 = (($11) + ($9<<3)|0);
 $ml = $12;
 $13 = $i;
 $14 = 32 << $13;
 $chunkSize = $14;
 $15 = $ml;
 $16 = (_ml_hasAvailable($15)|0);
 if ($16) {
  $17 = $ml;
  $18 = (_ml_pop($17)|0);
  $buf = $18;
  $19 = $2;
  $20 = $buf;
  $21 = $chunkSize;
  _msg_copyToBuffer($19,$20,$21);
  $22 = $buf;
  $0 = $22;
  $55 = $0;
  STACKTOP = sp;return ($55|0);
 }
 $23 = $1;
 $24 = (($23) + 8|0);
 $25 = HEAP32[$24>>2]|0;
 $26 = (($25) + 512)|0;
 $newIndex = $26;
 $27 = $newIndex;
 $28 = $1;
 $29 = (($28) + 4|0);
 $30 = HEAP32[$29>>2]|0;
 $31 = ($27>>>0)<=($30>>>0);
 if (!($31)) {
  ___assert_fail((792|0),(752|0),138,(776|0));
  // unreachable;
 }
 $32 = $1;
 $33 = (($32) + 8|0);
 $34 = HEAP32[$33>>2]|0;
 $i1 = $34;
 while(1) {
  $35 = $i1;
  $36 = $newIndex;
  $37 = ($35>>>0)<($36>>>0);
  if (!($37)) {
   break;
  }
  $38 = $ml;
  $39 = $1;
  $40 = HEAP32[$39>>2]|0;
  $41 = $i1;
  $42 = (($40) + ($41)|0);
  _ml_push($38,$42);
  $43 = $chunkSize;
  $44 = $i1;
  $45 = (($44) + ($43))|0;
  $i1 = $45;
 }
 $46 = $newIndex;
 $47 = $1;
 $48 = (($47) + 8|0);
 HEAP32[$48>>2] = $46;
 $49 = $ml;
 $50 = (_ml_pop($49)|0);
 $buf2 = $50;
 $51 = $2;
 $52 = $buf2;
 $53 = $chunkSize;
 _msg_copyToBuffer($51,$52,$53);
 $54 = $buf2;
 $0 = $54;
 $55 = $0;
 STACKTOP = sp;return ($55|0);
}
function _ml_free($ml) {
 $ml = $ml|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $n = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $ml;
 $1 = $0;
 $2 = ($1|0)!=(0|0);
 if (!($2)) {
  STACKTOP = sp;return;
 }
 while(1) {
  $3 = $0;
  $4 = (_ml_hasAvailable($3)|0);
  if (!($4)) {
   break;
  }
  $5 = $0;
  (_ml_pop($5)|0);
 }
 while(1) {
  $6 = $0;
  $7 = (($6) + 4|0);
  $8 = HEAP32[$7>>2]|0;
  $9 = ($8|0)!=(0|0);
  if (!($9)) {
   break;
  }
  $10 = $0;
  $11 = (($10) + 4|0);
  $12 = HEAP32[$11>>2]|0;
  $n = $12;
  $13 = $n;
  $14 = (($13) + 4|0);
  $15 = HEAP32[$14>>2]|0;
  $16 = $0;
  $17 = (($16) + 4|0);
  HEAP32[$17>>2] = $15;
  $18 = $n;
  _free($18);
 }
 STACKTOP = sp;return;
}
function _msg_getNumBytes132($m) {
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $0;
 $2 = (($1) + 6|0);
 $3 = HEAP16[$2>>1]|0;
 $4 = $3&65535;
 STACKTOP = sp;return ($4|0);
}
function _mp_messagelistIndexForSize($byteSize) {
 $byteSize = $byteSize|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $byteSize;
 $1 = $0;
 $2 = (_hv_min_max_log2($1)|0);
 $3 = (($2) - 5)|0;
 $4 = (_hv_max_i($3,0)|0);
 STACKTOP = sp;return ($4|0);
}
function _ml_push($ml,$p) {
 $ml = $ml|0;
 $p = $p|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0;
 var $7 = 0, $8 = 0, $9 = 0, $n = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $ml;
 $1 = $p;
 $n = 0;
 $2 = $0;
 $3 = (($2) + 4|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = ($4|0)!=(0|0);
 if ($5) {
  $6 = $0;
  $7 = (($6) + 4|0);
  $8 = HEAP32[$7>>2]|0;
  $n = $8;
  $9 = $n;
  $10 = (($9) + 4|0);
  $11 = HEAP32[$10>>2]|0;
  $12 = $0;
  $13 = (($12) + 4|0);
  HEAP32[$13>>2] = $11;
 } else {
  $14 = (_malloc(8)|0);
  $n = $14;
 }
 $15 = $1;
 $16 = $n;
 HEAP32[$16>>2] = $15;
 $17 = $0;
 $18 = HEAP32[$17>>2]|0;
 $19 = $n;
 $20 = (($19) + 4|0);
 HEAP32[$20>>2] = $18;
 $21 = $n;
 $22 = $0;
 HEAP32[$22>>2] = $21;
 STACKTOP = sp;return;
}
function _ml_hasAvailable($ml) {
 $ml = $ml|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $ml;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 $3 = ($2|0)!=(0|0);
 STACKTOP = sp;return ($3|0);
}
function _ml_pop($ml) {
 $ml = $ml|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $n = 0;
 var $p = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $ml;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 $n = $2;
 $3 = $n;
 $4 = (($3) + 4|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = $0;
 HEAP32[$6>>2] = $5;
 $7 = $0;
 $8 = (($7) + 4|0);
 $9 = HEAP32[$8>>2]|0;
 $10 = $n;
 $11 = (($10) + 4|0);
 HEAP32[$11>>2] = $9;
 $12 = $n;
 $13 = $0;
 $14 = (($13) + 4|0);
 HEAP32[$14>>2] = $12;
 $15 = $n;
 $16 = HEAP32[$15>>2]|0;
 $p = $16;
 $17 = $n;
 HEAP32[$17>>2] = 0;
 $18 = $p;
 STACKTOP = sp;return ($18|0);
}
function _mq_initWithPoolSize($q,$poolSizeKB) {
 $q = $q|0;
 $poolSizeKB = $poolSizeKB|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $q;
 $1 = $poolSizeKB;
 $2 = $0;
 HEAP32[$2>>2] = 0;
 $3 = $0;
 $4 = (($3) + 4|0);
 HEAP32[$4>>2] = 0;
 $5 = $0;
 $6 = (($5) + 8|0);
 HEAP32[$6>>2] = 0;
 $7 = $0;
 $8 = (($7) + 12|0);
 $9 = $1;
 (_mp_init($8,$9)|0);
 STACKTOP = sp;return;
}
function _mq_free($q) {
 $q = $q|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $n = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $q;
 $1 = $0;
 _mq_clear($1);
 while(1) {
  $2 = $0;
  $3 = (($2) + 8|0);
  $4 = HEAP32[$3>>2]|0;
  $5 = ($4|0)!=(0|0);
  if (!($5)) {
   break;
  }
  $6 = $0;
  $7 = (($6) + 8|0);
  $8 = HEAP32[$7>>2]|0;
  $n = $8;
  $9 = $0;
  $10 = (($9) + 8|0);
  $11 = HEAP32[$10>>2]|0;
  $12 = (($11) + 4|0);
  $13 = HEAP32[$12>>2]|0;
  $14 = $0;
  $15 = (($14) + 8|0);
  HEAP32[$15>>2] = $13;
  $16 = $n;
  _free($16);
 }
 $17 = $0;
 $18 = (($17) + 12|0);
 _mp_free($18);
 STACKTOP = sp;return;
}
function _mq_clear($q) {
 $q = $q|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $q;
 while(1) {
  $1 = $0;
  $2 = (_mq_hasMessage143($1)|0);
  if (!($2)) {
   break;
  }
  $3 = $0;
  _mq_pop($3);
 }
 STACKTOP = sp;return;
}
function _mq_addMessage($q,$m,$let,$sendMessage) {
 $q = $q|0;
 $m = $m|0;
 $let = $let|0;
 $sendMessage = $sendMessage|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $node = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $q;
 $1 = $m;
 $2 = $let;
 $3 = $sendMessage;
 $4 = $0;
 $5 = (_mq_getOrCreateNodeFromPool($4)|0);
 $node = $5;
 $6 = $0;
 $7 = (($6) + 12|0);
 $8 = $1;
 $9 = (_mp_addMessage($7,$8)|0);
 $10 = $node;
 $11 = (($10) + 12|0);
 HEAP32[$11>>2] = $9;
 $12 = $2;
 $13 = $node;
 $14 = (($13) + 8|0);
 HEAP32[$14>>2] = $12;
 $15 = $3;
 $16 = $node;
 $17 = (($16) + 16|0);
 HEAP32[$17>>2] = $15;
 $18 = $node;
 HEAP32[$18>>2] = 0;
 $19 = $node;
 $20 = (($19) + 4|0);
 HEAP32[$20>>2] = 0;
 $21 = $0;
 $22 = (($21) + 4|0);
 $23 = HEAP32[$22>>2]|0;
 $24 = ($23|0)!=(0|0);
 if ($24) {
  $25 = $node;
  $26 = $0;
  $27 = (($26) + 4|0);
  $28 = HEAP32[$27>>2]|0;
  $29 = (($28) + 4|0);
  HEAP32[$29>>2] = $25;
  $30 = $0;
  $31 = (($30) + 4|0);
  $32 = HEAP32[$31>>2]|0;
  $33 = $node;
  HEAP32[$33>>2] = $32;
  $34 = $node;
  $35 = $0;
  $36 = (($35) + 4|0);
  HEAP32[$36>>2] = $34;
  $43 = $node;
  $44 = (_mq_node_getMessage144($43)|0);
  STACKTOP = sp;return ($44|0);
 } else {
  $37 = $node;
  HEAP32[$37>>2] = 0;
  $38 = $node;
  $39 = $0;
  HEAP32[$39>>2] = $38;
  $40 = $node;
  $41 = $0;
  $42 = (($41) + 4|0);
  HEAP32[$42>>2] = $40;
  $43 = $node;
  $44 = (_mq_node_getMessage144($43)|0);
  STACKTOP = sp;return ($44|0);
 }
 return (0)|0;
}
function _mq_addMessageByTimestamp($q,$m,$let,$sendMessage) {
 $q = $q|0;
 $m = $m|0;
 $let = $let|0;
 $sendMessage = $sendMessage|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0;
 var $n = 0, $node = 0, $r = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $q;
 $2 = $m;
 $3 = $let;
 $4 = $sendMessage;
 $5 = $1;
 $6 = (_mq_hasMessage143($5)|0);
 if (!($6)) {
  $94 = $1;
  $95 = $2;
  $96 = $3;
  $97 = $4;
  $98 = (_mq_addMessage($94,$95,$96,$97)|0);
  $0 = $98;
  $99 = $0;
  STACKTOP = sp;return ($99|0);
 }
 $7 = $1;
 $8 = (_mq_getOrCreateNodeFromPool($7)|0);
 $n = $8;
 $9 = $1;
 $10 = (($9) + 12|0);
 $11 = $2;
 $12 = (_mp_addMessage($10,$11)|0);
 $13 = $n;
 $14 = (($13) + 12|0);
 HEAP32[$14>>2] = $12;
 $15 = $3;
 $16 = $n;
 $17 = (($16) + 8|0);
 HEAP32[$17>>2] = $15;
 $18 = $4;
 $19 = $n;
 $20 = (($19) + 16|0);
 HEAP32[$20>>2] = $18;
 $21 = $2;
 $22 = (_msg_getTimestamp145($21)|0);
 $23 = $1;
 $24 = HEAP32[$23>>2]|0;
 $25 = (($24) + 12|0);
 $26 = HEAP32[$25>>2]|0;
 $27 = (_msg_getTimestamp145($26)|0);
 $28 = ($22>>>0)<($27>>>0);
 if ($28) {
  $29 = $1;
  $30 = HEAP32[$29>>2]|0;
  $31 = $n;
  $32 = (($31) + 4|0);
  HEAP32[$32>>2] = $30;
  $33 = $n;
  $34 = $1;
  $35 = HEAP32[$34>>2]|0;
  HEAP32[$35>>2] = $33;
  $36 = $n;
  HEAP32[$36>>2] = 0;
  $37 = $n;
  $38 = $1;
  HEAP32[$38>>2] = $37;
 } else {
  $39 = $2;
  $40 = (_msg_getTimestamp145($39)|0);
  $41 = $1;
  $42 = (($41) + 4|0);
  $43 = HEAP32[$42>>2]|0;
  $44 = (($43) + 12|0);
  $45 = HEAP32[$44>>2]|0;
  $46 = (_msg_getTimestamp145($45)|0);
  $47 = ($40>>>0)>=($46>>>0);
  if ($47) {
   $48 = $n;
   $49 = (($48) + 4|0);
   HEAP32[$49>>2] = 0;
   $50 = $1;
   $51 = (($50) + 4|0);
   $52 = HEAP32[$51>>2]|0;
   $53 = $n;
   HEAP32[$53>>2] = $52;
   $54 = $n;
   $55 = $1;
   $56 = (($55) + 4|0);
   $57 = HEAP32[$56>>2]|0;
   $58 = (($57) + 4|0);
   HEAP32[$58>>2] = $54;
   $59 = $n;
   $60 = $1;
   $61 = (($60) + 4|0);
   HEAP32[$61>>2] = $59;
  } else {
   $62 = $1;
   $63 = HEAP32[$62>>2]|0;
   $node = $63;
   while(1) {
    $64 = $node;
    $65 = ($64|0)!=(0|0);
    if (!($65)) {
     break;
    }
    $66 = $2;
    $67 = HEAP32[$66>>2]|0;
    $68 = $node;
    $69 = (($68) + 4|0);
    $70 = HEAP32[$69>>2]|0;
    $71 = (($70) + 12|0);
    $72 = HEAP32[$71>>2]|0;
    $73 = (_msg_getTimestamp145($72)|0);
    $74 = ($67>>>0)<($73>>>0);
    if ($74) {
     label = 9;
     break;
    }
    $88 = $node;
    $89 = (($88) + 4|0);
    $90 = HEAP32[$89>>2]|0;
    $node = $90;
   }
   if ((label|0) == 9) {
    $75 = $node;
    $76 = (($75) + 4|0);
    $77 = HEAP32[$76>>2]|0;
    $r = $77;
    $78 = $n;
    $79 = $node;
    $80 = (($79) + 4|0);
    HEAP32[$80>>2] = $78;
    $81 = $r;
    $82 = $n;
    $83 = (($82) + 4|0);
    HEAP32[$83>>2] = $81;
    $84 = $node;
    $85 = $n;
    HEAP32[$85>>2] = $84;
    $86 = $n;
    $87 = $r;
    HEAP32[$87>>2] = $86;
   }
  }
 }
 $91 = $n;
 $92 = (($91) + 12|0);
 $93 = HEAP32[$92>>2]|0;
 $0 = $93;
 $99 = $0;
 STACKTOP = sp;return ($99|0);
}
function _mq_pop($q) {
 $q = $q|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $n = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $q;
 $1 = $0;
 $2 = (_mq_hasMessage143($1)|0);
 if (!($2)) {
  STACKTOP = sp;return;
 }
 $3 = $0;
 $4 = HEAP32[$3>>2]|0;
 $n = $4;
 $5 = $0;
 $6 = (($5) + 12|0);
 $7 = $n;
 $8 = (($7) + 12|0);
 $9 = HEAP32[$8>>2]|0;
 _mp_freeMessage($6,$9);
 $10 = $n;
 $11 = (($10) + 12|0);
 HEAP32[$11>>2] = 0;
 $12 = $n;
 $13 = (($12) + 8|0);
 HEAP32[$13>>2] = 0;
 $14 = $n;
 $15 = (($14) + 16|0);
 HEAP32[$15>>2] = 0;
 $16 = $n;
 $17 = (($16) + 4|0);
 $18 = HEAP32[$17>>2]|0;
 $19 = $0;
 HEAP32[$19>>2] = $18;
 $20 = $0;
 $21 = HEAP32[$20>>2]|0;
 $22 = ($21|0)==(0|0);
 if ($22) {
  $23 = $0;
  $24 = (($23) + 4|0);
  HEAP32[$24>>2] = 0;
 } else {
  $25 = $0;
  $26 = HEAP32[$25>>2]|0;
  HEAP32[$26>>2] = 0;
 }
 $27 = $0;
 $28 = (($27) + 8|0);
 $29 = HEAP32[$28>>2]|0;
 $30 = $n;
 $31 = (($30) + 4|0);
 HEAP32[$31>>2] = $29;
 $32 = $n;
 HEAP32[$32>>2] = 0;
 $33 = $n;
 $34 = $0;
 $35 = (($34) + 8|0);
 HEAP32[$35>>2] = $33;
 STACKTOP = sp;return;
}
function _mq_removeMessage($q,$m) {
 $q = $q|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $8 = 0, $9 = 0, $currNode = 0, $prevNode = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $q;
 $1 = $m;
 $2 = $0;
 $3 = (_mq_hasMessage143($2)|0);
 if (!($3)) {
  STACKTOP = sp;return;
 }
 $4 = $0;
 $5 = HEAP32[$4>>2]|0;
 $6 = (_mq_node_getMessage144($5)|0);
 $7 = $1;
 $8 = ($6|0)==($7|0);
 if ($8) {
  $9 = $0;
  _mq_pop($9);
 } else {
  $10 = $0;
  $11 = HEAP32[$10>>2]|0;
  $prevNode = $11;
  $12 = $0;
  $13 = HEAP32[$12>>2]|0;
  $14 = (($13) + 4|0);
  $15 = HEAP32[$14>>2]|0;
  $currNode = $15;
  while(1) {
   $16 = $currNode;
   $17 = ($16|0)!=(0|0);
   if ($17) {
    $18 = $currNode;
    $19 = (($18) + 12|0);
    $20 = HEAP32[$19>>2]|0;
    $21 = $1;
    $22 = ($20|0)!=($21|0);
    $71 = $22;
   } else {
    $71 = 0;
   }
   if (!($71)) {
    break;
   }
   $23 = $currNode;
   $prevNode = $23;
   $24 = $currNode;
   $25 = (($24) + 4|0);
   $26 = HEAP32[$25>>2]|0;
   $currNode = $26;
  }
  $27 = $currNode;
  $28 = ($27|0)!=(0|0);
  if ($28) {
   $29 = $0;
   $30 = (($29) + 12|0);
   $31 = $1;
   _mp_freeMessage($30,$31);
   $32 = $currNode;
   $33 = (($32) + 12|0);
   HEAP32[$33>>2] = 0;
   $34 = $currNode;
   $35 = (($34) + 8|0);
   HEAP32[$35>>2] = 0;
   $36 = $currNode;
   $37 = (($36) + 16|0);
   HEAP32[$37>>2] = 0;
   $38 = $currNode;
   $39 = $0;
   $40 = (($39) + 4|0);
   $41 = HEAP32[$40>>2]|0;
   $42 = ($38|0)==($41|0);
   if ($42) {
    $43 = $prevNode;
    $44 = (($43) + 4|0);
    HEAP32[$44>>2] = 0;
    $45 = $prevNode;
    $46 = $0;
    $47 = (($46) + 4|0);
    HEAP32[$47>>2] = $45;
   } else {
    $48 = $currNode;
    $49 = (($48) + 4|0);
    $50 = HEAP32[$49>>2]|0;
    $51 = $prevNode;
    $52 = (($51) + 4|0);
    HEAP32[$52>>2] = $50;
    $53 = $prevNode;
    $54 = $currNode;
    $55 = (($54) + 4|0);
    $56 = HEAP32[$55>>2]|0;
    HEAP32[$56>>2] = $53;
   }
   $57 = $0;
   $58 = (($57) + 8|0);
   $59 = HEAP32[$58>>2]|0;
   $60 = ($59|0)==(0|0);
   if ($60) {
    $66 = 0;
   } else {
    $61 = $0;
    $62 = (($61) + 8|0);
    $63 = HEAP32[$62>>2]|0;
    $66 = $63;
   }
   $64 = $currNode;
   $65 = (($64) + 4|0);
   HEAP32[$65>>2] = $66;
   $67 = $currNode;
   HEAP32[$67>>2] = 0;
   $68 = $currNode;
   $69 = $0;
   $70 = (($69) + 8|0);
   HEAP32[$70>>2] = $68;
  }
 }
 STACKTOP = sp;return;
}
function _mq_hasMessage143($q) {
 $q = $q|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $q;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 $3 = ($2|0)!=(0|0);
 STACKTOP = sp;return ($3|0);
}
function _mq_getOrCreateNodeFromPool($q) {
 $q = $q|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0;
 var $7 = 0, $8 = 0, $9 = 0, $node = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $q;
 $1 = $0;
 $2 = (($1) + 8|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = ($3|0)==(0|0);
 if ($4) {
  $5 = (_malloc(20)|0);
  $6 = $0;
  $7 = (($6) + 8|0);
  HEAP32[$7>>2] = $5;
  $8 = $0;
  $9 = (($8) + 8|0);
  $10 = HEAP32[$9>>2]|0;
  $11 = (($10) + 4|0);
  HEAP32[$11>>2] = 0;
 }
 $12 = $0;
 $13 = (($12) + 8|0);
 $14 = HEAP32[$13>>2]|0;
 $node = $14;
 $15 = $0;
 $16 = (($15) + 8|0);
 $17 = HEAP32[$16>>2]|0;
 $18 = (($17) + 4|0);
 $19 = HEAP32[$18>>2]|0;
 $20 = $0;
 $21 = (($20) + 8|0);
 HEAP32[$21>>2] = $19;
 $22 = $node;
 STACKTOP = sp;return ($22|0);
}
function _mq_node_getMessage144($n) {
 $n = $n|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $n;
 $1 = $0;
 $2 = (($1) + 12|0);
 $3 = HEAP32[$2>>2]|0;
 STACKTOP = sp;return ($3|0);
}
function _msg_getTimestamp145($m) {
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 STACKTOP = sp;return ($2|0);
}
function _sBiquad_k_init($o,$b0,$b1,$b2,$a1,$a2) {
 $o = $o|0;
 $b0 = +$b0;
 $b1 = +$b1;
 $b2 = +$b2;
 $a1 = +$a1;
 $a2 = +$a2;
 var $0 = 0, $1 = 0.0, $10 = 0, $11 = 0, $12 = 0.0, $13 = 0, $14 = 0, $15 = 0.0, $16 = 0, $17 = 0, $18 = 0.0, $19 = 0, $2 = 0.0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $3 = 0.0, $4 = 0.0, $5 = 0.0, $6 = 0.0, $7 = 0, $8 = 0, $9 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $o;
 $1 = $b0;
 $2 = $b1;
 $3 = $b2;
 $4 = $a1;
 $5 = $a2;
 $6 = $1;
 $7 = $0;
 $8 = (($7) + 16|0);
 HEAPF32[$8>>2] = $6;
 $9 = $2;
 $10 = $0;
 $11 = (($10) + 20|0);
 HEAPF32[$11>>2] = $9;
 $12 = $3;
 $13 = $0;
 $14 = (($13) + 24|0);
 HEAPF32[$14>>2] = $12;
 $15 = $4;
 $16 = $0;
 $17 = (($16) + 28|0);
 HEAPF32[$17>>2] = $15;
 $18 = $5;
 $19 = $0;
 $20 = (($19) + 32|0);
 HEAPF32[$20>>2] = $18;
 $21 = $0;
 _sBiquad_k_updateCoefficients($21);
 $22 = $0;
 HEAPF32[$22>>2] = 0.0;
 $23 = $0;
 $24 = (($23) + 4|0);
 HEAPF32[$24>>2] = 0.0;
 $25 = $0;
 $26 = (($25) + 8|0);
 HEAPF32[$26>>2] = 0.0;
 $27 = $0;
 $28 = (($27) + 12|0);
 HEAPF32[$28>>2] = 0.0;
 STACKTOP = sp;return 0;
}
function _sBiquad_k_onMessage($o,$letIn,$m) {
 $o = $o|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0.0, $13 = 0, $14 = 0, $15 = 0, $16 = 0.0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0.0, $21 = 0, $22 = 0, $23 = 0, $24 = 0.0, $25 = 0, $26 = 0;
 var $27 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0.0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $o;
 $1 = $letIn;
 $2 = $m;
 $3 = $2;
 $4 = (_msg_isFloat150($3,0)|0);
 $5 = ($4|0)!=(0);
 if (!($5)) {
  STACKTOP = sp;return;
 }
 $6 = $1;
 switch ($6|0) {
 case 2:  {
  $11 = $2;
  $12 = (+_msg_getFloat151($11,0));
  $13 = $0;
  $14 = (($13) + 20|0);
  HEAPF32[$14>>2] = $12;
  break;
 }
 case 5:  {
  $23 = $2;
  $24 = (+_msg_getFloat151($23,0));
  $25 = $0;
  $26 = (($25) + 32|0);
  HEAPF32[$26>>2] = $24;
  break;
 }
 case 1:  {
  $7 = $2;
  $8 = (+_msg_getFloat151($7,0));
  $9 = $0;
  $10 = (($9) + 16|0);
  HEAPF32[$10>>2] = $8;
  break;
 }
 case 3:  {
  $15 = $2;
  $16 = (+_msg_getFloat151($15,0));
  $17 = $0;
  $18 = (($17) + 24|0);
  HEAPF32[$18>>2] = $16;
  break;
 }
 case 4:  {
  $19 = $2;
  $20 = (+_msg_getFloat151($19,0));
  $21 = $0;
  $22 = (($21) + 28|0);
  HEAPF32[$22>>2] = $20;
  break;
 }
 default: {
  STACKTOP = sp;return;
 }
 }
 $27 = $0;
 _sBiquad_k_updateCoefficients($27);
 STACKTOP = sp;return;
}
function _sBiquad_k_updateCoefficients($o) {
 $o = $o|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $o;
 STACKTOP = sp;return;
}
function _msg_isFloat150($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = ($6|0)==(1);
 $8 = $7&1;
 STACKTOP = sp;return ($8|0);
}
function _msg_getFloat151($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = (($5) + 4|0);
 $7 = +HEAPF32[$6>>2];
 STACKTOP = sp;return (+$7);
}
function _sPhasor_k_init($o,$frequency,$samplerate) {
 $o = $o|0;
 $frequency = +$frequency;
 $samplerate = +$samplerate;
 var $0 = 0, $1 = 0.0, $2 = 0.0, $3 = 0, $4 = 0.0, $5 = 0.0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $o;
 $1 = $frequency;
 $2 = $samplerate;
 $3 = $0;
 $4 = $1;
 $5 = $2;
 _sPhasor_updateFrequency($3,$4,$5);
 $6 = $0;
 _sPhasor_updatePhase($6,0.0);
 STACKTOP = sp;return 0;
}
function _sPhasor_k_onMessage($_c,$o,$letIn,$m) {
 $_c = $_c|0;
 $o = $o|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $10 = 0.0, $11 = 0, $12 = 0.0, $13 = 0, $14 = 0, $15 = 0.0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $o;
 $2 = $letIn;
 $3 = $m;
 $4 = $3;
 $5 = (_msg_isFloat156($4,0)|0);
 $6 = ($5|0)!=(0);
 if (!($6)) {
  STACKTOP = sp;return;
 }
 $7 = $2;
 if ((($7|0) == 1)) {
  $13 = $1;
  $14 = $3;
  $15 = (+_msg_getFloat157($14,0));
  _sPhasor_updatePhase($13,$15);
 } else if ((($7|0) == 0)) {
  $8 = $1;
  $9 = $3;
  $10 = (+_msg_getFloat157($9,0));
  $11 = $0;
  $12 = (+_ctx_getSampleRate158($11));
  _sPhasor_updateFrequency($8,$10,$12);
 } else {
 }
 STACKTOP = sp;return;
}
function _msg_isFloat156($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = ($6|0)==(1);
 $8 = $7&1;
 STACKTOP = sp;return ($8|0);
}
function _msg_getFloat157($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = (($5) + 4|0);
 $7 = +HEAPF32[$6>>2];
 STACKTOP = sp;return (+$7);
}
function _sPhasor_updateFrequency($o,$f,$r) {
 $o = $o|0;
 $f = +$f;
 $r = +$r;
 var $0 = 0, $1 = 0.0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $2 = 0.0, $3 = 0.0, $4 = 0.0, $5 = 0.0, $6 = 0.0, $7 = 0.0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $o;
 $1 = $f;
 $2 = $r;
 $3 = $1;
 $4 = $3;
 $5 = $2;
 $6 = 4294967295.0 / $5;
 $7 = $4 * $6;
 $8 = (~~(($7)));
 $9 = $0;
 HEAP32[$9>>2] = $8;
 $10 = $0;
 $11 = HEAP32[$10>>2]|0;
 $12 = $0;
 $13 = (($12) + 8|0);
 HEAP32[$13>>2] = $11;
 STACKTOP = sp;return;
}
function _sPhasor_updatePhase($o,$phase) {
 $o = $o|0;
 $phase = +$phase;
 var $0 = 0, $1 = 0.0, $10 = 0.0, $11 = 0.0, $12 = 0.0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0.0, $3 = 0, $4 = 0.0, $5 = 0.0, $6 = 0.0, $7 = 0, $8 = 0.0, $9 = 0.0, $p = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $o;
 $1 = $phase;
 while(1) {
  $2 = $1;
  $3 = $2 < 0.0;
  if (!($3)) {
   break;
  }
  $4 = $1;
  $5 = $4 + 1.0;
  $1 = $5;
 }
 while(1) {
  $6 = $1;
  $7 = $6 > 1.0;
  if (!($7)) {
   break;
  }
  $8 = $1;
  $9 = $8 - 1.0;
  $1 = $9;
 }
 $10 = $1;
 $11 = $10;
 $12 = $11 * 4294967295.0;
 $13 = (~~(($12))>>>0);
 $p = $13;
 $14 = $p;
 $15 = $0;
 $16 = (($15) + 4|0);
 HEAP32[$16>>2] = $14;
 STACKTOP = sp;return;
}
function _ctx_getSampleRate158($_c) {
 $_c = $_c|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $0;
 $2 = (($1) + 8|0);
 $3 = +HEAPF64[$2>>3];
 STACKTOP = sp;return (+$3);
}
function _sTabread_init($o,$table,$forceAlignedLoads) {
 $o = $o|0;
 $table = $table|0;
 $forceAlignedLoads = $forceAlignedLoads|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $o;
 $1 = $table;
 $3 = $forceAlignedLoads&1;
 $2 = $3;
 $4 = $1;
 $5 = $0;
 HEAP32[$5>>2] = $4;
 $6 = $0;
 $7 = (($6) + 4|0);
 HEAP32[$7>>2] = 0;
 $8 = $2;
 $9 = $8&1;
 $10 = $0;
 $11 = (($10) + 8|0);
 $12 = $9&1;
 HEAP8[$11>>0] = $12;
 STACKTOP = sp;return 0;
}
function _sTabread_onMessage($_c,$o,$letIn,$m) {
 $_c = $_c|0;
 $o = $o|0;
 $letIn = $letIn|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0.0, $14 = 0.0, $15 = 0, $16 = 0, $17 = 0.0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var $h = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $o;
 $2 = $letIn;
 $3 = $m;
 $4 = $2;
 if ((($4|0) == 0)) {
  $5 = $1;
  $6 = HEAP32[$5>>2]|0;
  $7 = ($6|0)!=(0|0);
  if ($7) {
   $8 = $3;
   $9 = (_msg_getType163($8,0)|0);
   if ((($9|0) == 0)) {
    $10 = $1;
    $11 = (($10) + 4|0);
    HEAP32[$11>>2] = 0;
   } else if ((($9|0) == 1)) {
    $12 = $3;
    $13 = (+_msg_getFloat164($12,0));
    $14 = (+Math_abs((+$13)));
    $15 = (~~(($14))>>>0);
    $h = $15;
    $16 = $3;
    $17 = (+_msg_getFloat164($16,0));
    $18 = $17 < 0.0;
    if ($18) {
     $19 = $1;
     $20 = HEAP32[$19>>2]|0;
     $21 = (_hTable_getSize165($20)|0);
     $22 = $h;
     $23 = (($21) - ($22))|0;
     $h = $23;
    }
    $24 = $1;
    $25 = (($24) + 8|0);
    $26 = HEAP8[$25>>0]|0;
    $27 = $26&1;
    if ($27) {
     $28 = $h;
     $32 = $28;
    } else {
     $29 = $h;
     $32 = $29;
    }
    $30 = $1;
    $31 = (($30) + 4|0);
    HEAP32[$31>>2] = $32;
   } else {
   }
  }
  STACKTOP = sp;return;
 } else if ((($4|0) == 1)) {
  $33 = $3;
  $34 = (_msg_isHashLike($33,0)|0);
  if ($34) {
   $35 = $0;
   $36 = $3;
   $37 = (_msg_getHash($36,0)|0);
   $38 = (_ctx_getTableForHash166($35,$37)|0);
   $39 = $1;
   HEAP32[$39>>2] = $38;
  }
  STACKTOP = sp;return;
 } else {
  STACKTOP = sp;return;
 }
}
function _msg_getType163($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = HEAP32[$5>>2]|0;
 STACKTOP = sp;return ($6|0);
}
function _msg_getFloat164($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = (($5) + 4|0);
 $7 = +HEAPF32[$6>>2];
 STACKTOP = sp;return (+$7);
}
function _hTable_getSize165($o) {
 $o = $o|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $o;
 $1 = $0;
 $2 = (($1) + 8|0);
 $3 = HEAP32[$2>>2]|0;
 STACKTOP = sp;return ($3|0);
}
function _msg_isHashLike($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = ($6|0)==(3);
 if ($7) {
  $14 = 1;
  STACKTOP = sp;return ($14|0);
 }
 $8 = $0;
 $9 = (($8) + 8|0);
 $10 = $1;
 $11 = (($9) + ($10<<3)|0);
 $12 = HEAP32[$11>>2]|0;
 $13 = ($12|0)==(2);
 $14 = $13;
 STACKTOP = sp;return ($14|0);
}
function _ctx_getTableForHash166($_c,$h) {
 $_c = $_c|0;
 $h = $h|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $h;
 $2 = $0;
 $3 = (($2) + 28|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = $0;
 $6 = $1;
 $7 = (FUNCTION_TABLE_iii[$4 & 7]($5,$6)|0);
 STACKTOP = sp;return ($7|0);
}
function _sTabwrite_init($o,$table) {
 $o = $o|0;
 $table = $table|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $o;
 $1 = $table;
 $2 = $1;
 $3 = $0;
 HEAP32[$3>>2] = $2;
 $4 = $0;
 $5 = (($4) + 4|0);
 HEAP32[$5>>2] = 0;
 STACKTOP = sp;return 0;
}
function _sTabwrite_onMessage($_c,$o,$letIn,$m,$sendMessage) {
 $_c = $_c|0;
 $o = $o|0;
 $letIn = $letIn|0;
 $m = $m|0;
 $sendMessage = $sendMessage|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0.0, $12 = 0, $13 = 0, $14 = 0.0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $o;
 $2 = $letIn;
 $3 = $m;
 $4 = $sendMessage;
 $5 = $2;
 if ((($5|0) == 1)) {
  $6 = $3;
  $7 = (_msg_getType172($6,0)|0);
  if ((($7|0) == 0)) {
   $8 = $1;
   $9 = (($8) + 4|0);
   HEAP32[$9>>2] = 0;
  } else if ((($7|0) == 1)) {
   $10 = $3;
   $11 = (+_msg_getFloat173($10,0));
   $12 = $11 >= 0.0;
   if ($12) {
    $13 = $3;
    $14 = (+_msg_getFloat173($13,0));
    $15 = (~~(($14))>>>0);
    $18 = $15;
   } else {
    $18 = -1;
   }
   $16 = $1;
   $17 = (($16) + 4|0);
   HEAP32[$17>>2] = $18;
  } else if ((($7|0) == 2)) {
   $19 = $3;
   $20 = (_msg_compareSymbol($19,0,824)|0);
   if ($20) {
    $21 = $1;
    $22 = (($21) + 4|0);
    HEAP32[$22>>2] = -1;
   }
  } else {
  }
  STACKTOP = sp;return;
 } else if ((($5|0) == 2)) {
  $23 = $3;
  $24 = (_msg_isHashLike174($23,0)|0);
  if ($24) {
   $25 = $0;
   $26 = $3;
   $27 = (_msg_getHash($26,0)|0);
   $28 = (_ctx_getTableForHash175($25,$27)|0);
   $29 = $1;
   HEAP32[$29>>2] = $28;
  }
  STACKTOP = sp;return;
 } else {
  STACKTOP = sp;return;
 }
}
function _msg_getType172($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = HEAP32[$5>>2]|0;
 STACKTOP = sp;return ($6|0);
}
function _msg_getFloat173($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = (($5) + 4|0);
 $7 = +HEAPF32[$6>>2];
 STACKTOP = sp;return (+$7);
}
function _msg_isHashLike174($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = ($6|0)==(3);
 if ($7) {
  $14 = 1;
  STACKTOP = sp;return ($14|0);
 }
 $8 = $0;
 $9 = (($8) + 8|0);
 $10 = $1;
 $11 = (($9) + ($10<<3)|0);
 $12 = HEAP32[$11>>2]|0;
 $13 = ($12|0)==(2);
 $14 = $13;
 STACKTOP = sp;return ($14|0);
}
function _ctx_getTableForHash175($_c,$h) {
 $_c = $_c|0;
 $h = $h|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $h;
 $2 = $0;
 $3 = (($2) + 28|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = $0;
 $6 = $1;
 $7 = (FUNCTION_TABLE_iii[$4 & 7]($5,$6)|0);
 STACKTOP = sp;return ($7|0);
}
function _sVarf_init($o,$k,$step,$reverse) {
 $o = $o|0;
 $k = +$k;
 $step = +$step;
 $reverse = $reverse|0;
 var $0 = 0, $1 = 0.0, $2 = 0.0, $3 = 0, $4 = 0, $5 = 0, $6 = 0.0, $7 = 0.0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $o;
 $1 = $k;
 $2 = $step;
 $4 = $reverse&1;
 $3 = $4;
 $5 = $0;
 $6 = $1;
 $7 = $2;
 $8 = $3;
 $9 = $8&1;
 _sVarf_update($5,$6,$7,$9);
 STACKTOP = sp;return 0;
}
function _sVarf_onMessage($_c,$o,$m) {
 $_c = $_c|0;
 $o = $o|0;
 $m = $m|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0.0, $14 = 0, $15 = 0, $16 = 0, $17 = 0.0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0.0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $_c;
 $1 = $o;
 $2 = $m;
 $3 = $2;
 $4 = (_msg_isFloat180($3,0)|0);
 $5 = ($4|0)!=(0);
 if (!($5)) {
  STACKTOP = sp;return;
 }
 $6 = $1;
 $7 = $2;
 $8 = (+_msg_getFloat181($7,0));
 $9 = $2;
 $10 = (_msg_isFloat180($9,1)|0);
 $11 = ($10|0)!=(0);
 if ($11) {
  $12 = $2;
  $13 = (+_msg_getFloat181($12,1));
  $17 = $13;
 } else {
  $17 = 0.0;
 }
 $14 = $2;
 $15 = (_msg_getNumElements182($14)|0);
 $16 = ($15|0)==(3);
 _sVarf_update($6,$8,$17,$16);
 STACKTOP = sp;return;
}
function _sVarf_update($o,$k,$step,$reverse) {
 $o = $o|0;
 $k = +$k;
 $step = +$step;
 $reverse = $reverse|0;
 var $0 = 0, $1 = 0.0, $2 = 0.0, $3 = 0, $4 = 0, $5 = 0.0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $o;
 $1 = $k;
 $2 = $step;
 $4 = $reverse&1;
 $3 = $4;
 $5 = $1;
 $6 = $0;
 HEAPF32[$6>>2] = $5;
 STACKTOP = sp;return;
}
function _msg_isFloat180($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = ($6|0)==(1);
 $8 = $7&1;
 STACKTOP = sp;return ($8|0);
}
function _msg_getFloat181($m,$index) {
 $m = $m|0;
 $index = $index|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $index;
 $2 = $0;
 $3 = (($2) + 8|0);
 $4 = $1;
 $5 = (($3) + ($4<<3)|0);
 $6 = (($5) + 4|0);
 $7 = +HEAPF32[$6>>2];
 STACKTOP = sp;return (+$7);
}
function _msg_getNumElements182($m) {
 $m = $m|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $m;
 $1 = $0;
 $2 = (($1) + 4|0);
 $3 = HEAP16[$2>>1]|0;
 $4 = $3&65535;
 STACKTOP = sp;return ($4|0);
}
function _hv_min_ui($x,$y) {
 $x = $x|0;
 $y = $y|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $x;
 $1 = $y;
 $2 = $0;
 $3 = $1;
 $4 = ($2>>>0)<=($3>>>0);
 if ($4) {
  $5 = $0;
  $7 = $5;
 } else {
  $6 = $1;
  $7 = $6;
 }
 STACKTOP = sp;return ($7|0);
}
function _hv_max_i($x,$y) {
 $x = $x|0;
 $y = $y|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $x;
 $1 = $y;
 $2 = $0;
 $3 = $1;
 $4 = ($2|0)>=($3|0);
 if ($4) {
  $5 = $0;
  $7 = $5;
 } else {
  $6 = $1;
  $7 = $6;
 }
 STACKTOP = sp;return ($7|0);
}
function _hv_min_max_log2($x) {
 $x = $x|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $x;
 $1 = $0;
 $2 = (($1) - 1)|0;
 $3 = (_llvm_ctlz_i32(($2|0))|0);
 $4 = (32 - ($3))|0;
 STACKTOP = sp;return ($4|0);
}
function _malloc($bytes) {
 $bytes = $bytes|0;
 var $$pre = 0, $$pre$i = 0, $$pre$i$i = 0, $$pre$i23$i = 0, $$pre$i25 = 0, $$pre$phi$i$iZ2D = 0, $$pre$phi$i24$iZ2D = 0, $$pre$phi$i26Z2D = 0, $$pre$phi$iZ2D = 0, $$pre$phi59$i$iZ2D = 0, $$pre$phiZ2D = 0, $$pre105 = 0, $$pre58$i$i = 0, $$rsize$0$i = 0, $$rsize$3$i = 0, $$sum = 0, $$sum$i$i = 0, $$sum$i$i$i = 0, $$sum$i12$i = 0, $$sum$i13$i = 0;
 var $$sum$i16$i = 0, $$sum$i19$i = 0, $$sum$i2338 = 0, $$sum$i32 = 0, $$sum$i39 = 0, $$sum1 = 0, $$sum1$i = 0, $$sum1$i$i = 0, $$sum1$i14$i = 0, $$sum1$i20$i = 0, $$sum1$i24 = 0, $$sum10 = 0, $$sum10$i = 0, $$sum10$i$i = 0, $$sum10$pre$i$i = 0, $$sum102$i = 0, $$sum103$i = 0, $$sum104$i = 0, $$sum105$i = 0, $$sum106$i = 0;
 var $$sum107$i = 0, $$sum108$i = 0, $$sum109$i = 0, $$sum11$i = 0, $$sum11$i$i = 0, $$sum11$i22$i = 0, $$sum110$i = 0, $$sum111$i = 0, $$sum1112 = 0, $$sum112$i = 0, $$sum113$i = 0, $$sum114$i = 0, $$sum115$i = 0, $$sum12$i = 0, $$sum12$i$i = 0, $$sum13$i = 0, $$sum13$i$i = 0, $$sum14$i$i = 0, $$sum14$pre$i = 0, $$sum15$i = 0;
 var $$sum15$i$i = 0, $$sum16$i = 0, $$sum16$i$i = 0, $$sum17$i = 0, $$sum17$i$i = 0, $$sum18$i = 0, $$sum1819$i$i = 0, $$sum2 = 0, $$sum2$i = 0, $$sum2$i$i = 0, $$sum2$i$i$i = 0, $$sum2$i15$i = 0, $$sum2$i17$i = 0, $$sum2$i21$i = 0, $$sum2$pre$i = 0, $$sum20$i$i = 0, $$sum21$i$i = 0, $$sum22$i$i = 0, $$sum23$i$i = 0, $$sum24$i$i = 0;
 var $$sum25$i$i = 0, $$sum26$pre$i$i = 0, $$sum27$i$i = 0, $$sum28$i$i = 0, $$sum29$i$i = 0, $$sum3$i = 0, $$sum3$i$i = 0, $$sum3$i27 = 0, $$sum30$i$i = 0, $$sum3132$i$i = 0, $$sum34$i$i = 0, $$sum3536$i$i = 0, $$sum3738$i$i = 0, $$sum39$i$i = 0, $$sum4 = 0, $$sum4$i = 0, $$sum4$i28 = 0, $$sum40$i$i = 0, $$sum41$i$i = 0, $$sum42$i$i = 0;
 var $$sum5$i = 0, $$sum5$i$i = 0, $$sum56 = 0, $$sum6$i = 0, $$sum67$i$i = 0, $$sum7$i = 0, $$sum8$i = 0, $$sum8$pre = 0, $$sum9 = 0, $$sum9$i = 0, $$sum9$i$i = 0, $$tsize$1$i = 0, $$v$0$i = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $1000 = 0, $1001 = 0, $1002 = 0;
 var $1003 = 0, $1004 = 0, $1005 = 0, $1006 = 0, $1007 = 0, $1008 = 0, $1009 = 0, $101 = 0, $1010 = 0, $1011 = 0, $1012 = 0, $1013 = 0, $1014 = 0, $1015 = 0, $1016 = 0, $1017 = 0, $1018 = 0, $1019 = 0, $102 = 0, $1020 = 0;
 var $1021 = 0, $1022 = 0, $1023 = 0, $1024 = 0, $1025 = 0, $1026 = 0, $1027 = 0, $1028 = 0, $1029 = 0, $103 = 0, $1030 = 0, $1031 = 0, $1032 = 0, $1033 = 0, $1034 = 0, $1035 = 0, $1036 = 0, $1037 = 0, $1038 = 0, $1039 = 0;
 var $104 = 0, $1040 = 0, $1041 = 0, $1042 = 0, $1043 = 0, $1044 = 0, $1045 = 0, $1046 = 0, $1047 = 0, $1048 = 0, $1049 = 0, $105 = 0, $1050 = 0, $1051 = 0, $1052 = 0, $1053 = 0, $1054 = 0, $1055 = 0, $1056 = 0, $1057 = 0;
 var $1058 = 0, $1059 = 0, $106 = 0, $1060 = 0, $1061 = 0, $1062 = 0, $1063 = 0, $1064 = 0, $1065 = 0, $1066 = 0, $1067 = 0, $1068 = 0, $1069 = 0, $107 = 0, $1070 = 0, $1071 = 0, $1072 = 0, $1073 = 0, $1074 = 0, $108 = 0;
 var $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0;
 var $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0;
 var $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0;
 var $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0;
 var $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0;
 var $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0;
 var $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0;
 var $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0;
 var $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0;
 var $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0;
 var $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0;
 var $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0;
 var $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0;
 var $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0;
 var $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0;
 var $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0;
 var $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0;
 var $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0;
 var $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0, $442 = 0, $443 = 0, $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0;
 var $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0, $459 = 0, $46 = 0, $460 = 0, $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0;
 var $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0, $477 = 0, $478 = 0, $479 = 0, $48 = 0, $480 = 0, $481 = 0, $482 = 0, $483 = 0, $484 = 0, $485 = 0, $486 = 0, $487 = 0;
 var $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0, $494 = 0, $495 = 0, $496 = 0, $497 = 0, $498 = 0, $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0;
 var $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0, $512 = 0, $513 = 0, $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0;
 var $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0, $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0;
 var $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0, $550 = 0, $551 = 0, $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0;
 var $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0;
 var $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0;
 var $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0, $604 = 0, $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0;
 var $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0, $620 = 0, $621 = 0, $622 = 0, $623 = 0, $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0;
 var $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0, $639 = 0, $64 = 0, $640 = 0, $641 = 0, $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0;
 var $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0, $654 = 0, $655 = 0, $656 = 0, $657 = 0, $658 = 0, $659 = 0, $66 = 0, $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0;
 var $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0, $672 = 0, $673 = 0, $674 = 0, $675 = 0, $676 = 0, $677 = 0, $678 = 0, $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0;
 var $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0, $692 = 0, $693 = 0, $694 = 0, $695 = 0, $696 = 0, $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0, $702 = 0;
 var $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0, $71 = 0, $710 = 0, $711 = 0, $712 = 0, $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0;
 var $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0, $730 = 0, $731 = 0, $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0;
 var $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0, $744 = 0, $745 = 0, $746 = 0, $747 = 0, $748 = 0, $749 = 0, $75 = 0, $750 = 0, $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0, $757 = 0;
 var $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0, $762 = 0, $763 = 0, $764 = 0, $765 = 0, $766 = 0, $767 = 0, $768 = 0, $769 = 0, $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0, $775 = 0;
 var $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0, $780 = 0, $781 = 0, $782 = 0, $783 = 0, $784 = 0, $785 = 0, $786 = 0, $787 = 0, $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0, $793 = 0;
 var $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0, $799 = 0, $8 = 0, $80 = 0, $800 = 0, $801 = 0, $802 = 0, $803 = 0, $804 = 0, $805 = 0, $806 = 0, $807 = 0, $808 = 0, $809 = 0, $81 = 0, $810 = 0;
 var $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0, $816 = 0, $817 = 0, $818 = 0, $819 = 0, $82 = 0, $820 = 0, $821 = 0, $822 = 0, $823 = 0, $824 = 0, $825 = 0, $826 = 0, $827 = 0, $828 = 0, $829 = 0;
 var $83 = 0, $830 = 0, $831 = 0, $832 = 0, $833 = 0, $834 = 0, $835 = 0, $836 = 0, $837 = 0, $838 = 0, $839 = 0, $84 = 0, $840 = 0, $841 = 0, $842 = 0, $843 = 0, $844 = 0, $845 = 0, $846 = 0, $847 = 0;
 var $848 = 0, $849 = 0, $85 = 0, $850 = 0, $851 = 0, $852 = 0, $853 = 0, $854 = 0, $855 = 0, $856 = 0, $857 = 0, $858 = 0, $859 = 0, $86 = 0, $860 = 0, $861 = 0, $862 = 0, $863 = 0, $864 = 0, $865 = 0;
 var $866 = 0, $867 = 0, $868 = 0, $869 = 0, $87 = 0, $870 = 0, $871 = 0, $872 = 0, $873 = 0, $874 = 0, $875 = 0, $876 = 0, $877 = 0, $878 = 0, $879 = 0, $88 = 0, $880 = 0, $881 = 0, $882 = 0, $883 = 0;
 var $884 = 0, $885 = 0, $886 = 0, $887 = 0, $888 = 0, $889 = 0, $89 = 0, $890 = 0, $891 = 0, $892 = 0, $893 = 0, $894 = 0, $895 = 0, $896 = 0, $897 = 0, $898 = 0, $899 = 0, $9 = 0, $90 = 0, $900 = 0;
 var $901 = 0, $902 = 0, $903 = 0, $904 = 0, $905 = 0, $906 = 0, $907 = 0, $908 = 0, $909 = 0, $91 = 0, $910 = 0, $911 = 0, $912 = 0, $913 = 0, $914 = 0, $915 = 0, $916 = 0, $917 = 0, $918 = 0, $919 = 0;
 var $92 = 0, $920 = 0, $921 = 0, $922 = 0, $923 = 0, $924 = 0, $925 = 0, $926 = 0, $927 = 0, $928 = 0, $929 = 0, $93 = 0, $930 = 0, $931 = 0, $932 = 0, $933 = 0, $934 = 0, $935 = 0, $936 = 0, $937 = 0;
 var $938 = 0, $939 = 0, $94 = 0, $940 = 0, $941 = 0, $942 = 0, $943 = 0, $944 = 0, $945 = 0, $946 = 0, $947 = 0, $948 = 0, $949 = 0, $95 = 0, $950 = 0, $951 = 0, $952 = 0, $953 = 0, $954 = 0, $955 = 0;
 var $956 = 0, $957 = 0, $958 = 0, $959 = 0, $96 = 0, $960 = 0, $961 = 0, $962 = 0, $963 = 0, $964 = 0, $965 = 0, $966 = 0, $967 = 0, $968 = 0, $969 = 0, $97 = 0, $970 = 0, $971 = 0, $972 = 0, $973 = 0;
 var $974 = 0, $975 = 0, $976 = 0, $977 = 0, $978 = 0, $979 = 0, $98 = 0, $980 = 0, $981 = 0, $982 = 0, $983 = 0, $984 = 0, $985 = 0, $986 = 0, $987 = 0, $988 = 0, $989 = 0, $99 = 0, $990 = 0, $991 = 0;
 var $992 = 0, $993 = 0, $994 = 0, $995 = 0, $996 = 0, $997 = 0, $998 = 0, $999 = 0, $F$0$i$i = 0, $F1$0$i = 0, $F4$0 = 0, $F4$0$i$i = 0, $F5$0$i = 0, $I1$0$c$i$i = 0, $I1$0$i$i = 0, $I7$0$i = 0, $I7$0$i$i = 0, $K12$027$i = 0, $K2$015$i$i = 0, $K8$053$i$i = 0;
 var $R$0$i = 0, $R$0$i$i = 0, $R$0$i18 = 0, $R$1$i = 0, $R$1$i$i = 0, $R$1$i20 = 0, $RP$0$i = 0, $RP$0$i$i = 0, $RP$0$i17 = 0, $T$0$lcssa$i = 0, $T$0$lcssa$i$i = 0, $T$0$lcssa$i26$i = 0, $T$014$i$i = 0, $T$026$i = 0, $T$052$i$i = 0, $br$0$i = 0, $br$030$i = 0, $cond$i = 0, $cond$i$i = 0, $cond$i21 = 0;
 var $exitcond$i$i = 0, $i$02$i$i = 0, $idx$0$i = 0, $mem$0 = 0, $nb$0 = 0, $oldfirst$0$i$i = 0, $or$cond$i = 0, $or$cond$i$i = 0, $or$cond$i27$i = 0, $or$cond$i29 = 0, $or$cond1$i = 0, $or$cond19$i = 0, $or$cond2$i = 0, $or$cond24$i = 0, $or$cond3$i = 0, $or$cond4$i = 0, $or$cond47$i = 0, $or$cond5$i = 0, $or$cond6$i = 0, $or$cond8$i = 0;
 var $qsize$0$i$i = 0, $rsize$0$i = 0, $rsize$0$i15 = 0, $rsize$1$i = 0, $rsize$2$i = 0, $rsize$3$lcssa$i = 0, $rsize$331$i = 0, $rst$0$i = 0, $rst$1$i = 0, $sizebits$0$i = 0, $sp$0$i$i = 0, $sp$0$i$i$i = 0, $sp$073$i = 0, $sp$166$i = 0, $ssize$0$i = 0, $ssize$1$i = 0, $ssize$129$i = 0, $ssize$2$i = 0, $t$0$i = 0, $t$0$i14 = 0;
 var $t$1$i = 0, $t$2$ph$i = 0, $t$2$v$3$i = 0, $t$230$i = 0, $tbase$245$i = 0, $tsize$03141$i = 0, $tsize$1$i = 0, $tsize$244$i = 0, $v$0$i = 0, $v$0$i16 = 0, $v$1$i = 0, $v$2$i = 0, $v$3$lcssa$i = 0, $v$332$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($bytes>>>0)<(245);
 do {
  if ($0) {
   $1 = ($bytes>>>0)<(11);
   if ($1) {
    $5 = 16;
   } else {
    $2 = (($bytes) + 11)|0;
    $3 = $2 & -8;
    $5 = $3;
   }
   $4 = $5 >>> 3;
   $6 = HEAP32[832>>2]|0;
   $7 = $6 >>> $4;
   $8 = $7 & 3;
   $9 = ($8|0)==(0);
   if (!($9)) {
    $10 = $7 & 1;
    $11 = $10 ^ 1;
    $12 = (($11) + ($4))|0;
    $13 = $12 << 1;
    $14 = ((832 + ($13<<2)|0) + 40|0);
    $$sum10 = (($13) + 2)|0;
    $15 = ((832 + ($$sum10<<2)|0) + 40|0);
    $16 = HEAP32[$15>>2]|0;
    $17 = (($16) + 8|0);
    $18 = HEAP32[$17>>2]|0;
    $19 = ($14|0)==($18|0);
    do {
     if ($19) {
      $20 = 1 << $12;
      $21 = $20 ^ -1;
      $22 = $6 & $21;
      HEAP32[832>>2] = $22;
     } else {
      $23 = HEAP32[((832 + 16|0))>>2]|0;
      $24 = ($18>>>0)<($23>>>0);
      if ($24) {
       _abort();
       // unreachable;
      }
      $25 = (($18) + 12|0);
      $26 = HEAP32[$25>>2]|0;
      $27 = ($26|0)==($16|0);
      if ($27) {
       HEAP32[$25>>2] = $14;
       HEAP32[$15>>2] = $18;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $28 = $12 << 3;
    $29 = $28 | 3;
    $30 = (($16) + 4|0);
    HEAP32[$30>>2] = $29;
    $$sum1112 = $28 | 4;
    $31 = (($16) + ($$sum1112)|0);
    $32 = HEAP32[$31>>2]|0;
    $33 = $32 | 1;
    HEAP32[$31>>2] = $33;
    $mem$0 = $17;
    STACKTOP = sp;return ($mem$0|0);
   }
   $34 = HEAP32[((832 + 8|0))>>2]|0;
   $35 = ($5>>>0)>($34>>>0);
   if ($35) {
    $36 = ($7|0)==(0);
    if (!($36)) {
     $37 = $7 << $4;
     $38 = 2 << $4;
     $39 = (0 - ($38))|0;
     $40 = $38 | $39;
     $41 = $37 & $40;
     $42 = (0 - ($41))|0;
     $43 = $41 & $42;
     $44 = (($43) + -1)|0;
     $45 = $44 >>> 12;
     $46 = $45 & 16;
     $47 = $44 >>> $46;
     $48 = $47 >>> 5;
     $49 = $48 & 8;
     $50 = $49 | $46;
     $51 = $47 >>> $49;
     $52 = $51 >>> 2;
     $53 = $52 & 4;
     $54 = $50 | $53;
     $55 = $51 >>> $53;
     $56 = $55 >>> 1;
     $57 = $56 & 2;
     $58 = $54 | $57;
     $59 = $55 >>> $57;
     $60 = $59 >>> 1;
     $61 = $60 & 1;
     $62 = $58 | $61;
     $63 = $59 >>> $61;
     $64 = (($62) + ($63))|0;
     $65 = $64 << 1;
     $66 = ((832 + ($65<<2)|0) + 40|0);
     $$sum4 = (($65) + 2)|0;
     $67 = ((832 + ($$sum4<<2)|0) + 40|0);
     $68 = HEAP32[$67>>2]|0;
     $69 = (($68) + 8|0);
     $70 = HEAP32[$69>>2]|0;
     $71 = ($66|0)==($70|0);
     do {
      if ($71) {
       $72 = 1 << $64;
       $73 = $72 ^ -1;
       $74 = $6 & $73;
       HEAP32[832>>2] = $74;
       $89 = $34;
      } else {
       $75 = HEAP32[((832 + 16|0))>>2]|0;
       $76 = ($70>>>0)<($75>>>0);
       if ($76) {
        _abort();
        // unreachable;
       }
       $77 = (($70) + 12|0);
       $78 = HEAP32[$77>>2]|0;
       $79 = ($78|0)==($68|0);
       if ($79) {
        HEAP32[$77>>2] = $66;
        HEAP32[$67>>2] = $70;
        $$pre = HEAP32[((832 + 8|0))>>2]|0;
        $89 = $$pre;
        break;
       } else {
        _abort();
        // unreachable;
       }
      }
     } while(0);
     $80 = $64 << 3;
     $81 = (($80) - ($5))|0;
     $82 = $5 | 3;
     $83 = (($68) + 4|0);
     HEAP32[$83>>2] = $82;
     $84 = (($68) + ($5)|0);
     $85 = $81 | 1;
     $$sum56 = $5 | 4;
     $86 = (($68) + ($$sum56)|0);
     HEAP32[$86>>2] = $85;
     $87 = (($68) + ($80)|0);
     HEAP32[$87>>2] = $81;
     $88 = ($89|0)==(0);
     if (!($88)) {
      $90 = HEAP32[((832 + 20|0))>>2]|0;
      $91 = $89 >>> 3;
      $92 = $91 << 1;
      $93 = ((832 + ($92<<2)|0) + 40|0);
      $94 = HEAP32[832>>2]|0;
      $95 = 1 << $91;
      $96 = $94 & $95;
      $97 = ($96|0)==(0);
      if ($97) {
       $98 = $94 | $95;
       HEAP32[832>>2] = $98;
       $$sum8$pre = (($92) + 2)|0;
       $$pre105 = ((832 + ($$sum8$pre<<2)|0) + 40|0);
       $$pre$phiZ2D = $$pre105;$F4$0 = $93;
      } else {
       $$sum9 = (($92) + 2)|0;
       $99 = ((832 + ($$sum9<<2)|0) + 40|0);
       $100 = HEAP32[$99>>2]|0;
       $101 = HEAP32[((832 + 16|0))>>2]|0;
       $102 = ($100>>>0)<($101>>>0);
       if ($102) {
        _abort();
        // unreachable;
       } else {
        $$pre$phiZ2D = $99;$F4$0 = $100;
       }
      }
      HEAP32[$$pre$phiZ2D>>2] = $90;
      $103 = (($F4$0) + 12|0);
      HEAP32[$103>>2] = $90;
      $104 = (($90) + 8|0);
      HEAP32[$104>>2] = $F4$0;
      $105 = (($90) + 12|0);
      HEAP32[$105>>2] = $93;
     }
     HEAP32[((832 + 8|0))>>2] = $81;
     HEAP32[((832 + 20|0))>>2] = $84;
     $mem$0 = $69;
     STACKTOP = sp;return ($mem$0|0);
    }
    $106 = HEAP32[((832 + 4|0))>>2]|0;
    $107 = ($106|0)==(0);
    if ($107) {
     $nb$0 = $5;
    } else {
     $108 = (0 - ($106))|0;
     $109 = $106 & $108;
     $110 = (($109) + -1)|0;
     $111 = $110 >>> 12;
     $112 = $111 & 16;
     $113 = $110 >>> $112;
     $114 = $113 >>> 5;
     $115 = $114 & 8;
     $116 = $115 | $112;
     $117 = $113 >>> $115;
     $118 = $117 >>> 2;
     $119 = $118 & 4;
     $120 = $116 | $119;
     $121 = $117 >>> $119;
     $122 = $121 >>> 1;
     $123 = $122 & 2;
     $124 = $120 | $123;
     $125 = $121 >>> $123;
     $126 = $125 >>> 1;
     $127 = $126 & 1;
     $128 = $124 | $127;
     $129 = $125 >>> $127;
     $130 = (($128) + ($129))|0;
     $131 = ((832 + ($130<<2)|0) + 304|0);
     $132 = HEAP32[$131>>2]|0;
     $133 = (($132) + 4|0);
     $134 = HEAP32[$133>>2]|0;
     $135 = $134 & -8;
     $136 = (($135) - ($5))|0;
     $rsize$0$i = $136;$t$0$i = $132;$v$0$i = $132;
     while(1) {
      $137 = (($t$0$i) + 16|0);
      $138 = HEAP32[$137>>2]|0;
      $139 = ($138|0)==(0|0);
      if ($139) {
       $140 = (($t$0$i) + 20|0);
       $141 = HEAP32[$140>>2]|0;
       $142 = ($141|0)==(0|0);
       if ($142) {
        break;
       } else {
        $144 = $141;
       }
      } else {
       $144 = $138;
      }
      $143 = (($144) + 4|0);
      $145 = HEAP32[$143>>2]|0;
      $146 = $145 & -8;
      $147 = (($146) - ($5))|0;
      $148 = ($147>>>0)<($rsize$0$i>>>0);
      $$rsize$0$i = $148 ? $147 : $rsize$0$i;
      $$v$0$i = $148 ? $144 : $v$0$i;
      $rsize$0$i = $$rsize$0$i;$t$0$i = $144;$v$0$i = $$v$0$i;
     }
     $149 = HEAP32[((832 + 16|0))>>2]|0;
     $150 = ($v$0$i>>>0)<($149>>>0);
     if ($150) {
      _abort();
      // unreachable;
     }
     $151 = (($v$0$i) + ($5)|0);
     $152 = ($v$0$i>>>0)<($151>>>0);
     if (!($152)) {
      _abort();
      // unreachable;
     }
     $153 = (($v$0$i) + 24|0);
     $154 = HEAP32[$153>>2]|0;
     $155 = (($v$0$i) + 12|0);
     $156 = HEAP32[$155>>2]|0;
     $157 = ($156|0)==($v$0$i|0);
     do {
      if ($157) {
       $167 = (($v$0$i) + 20|0);
       $168 = HEAP32[$167>>2]|0;
       $169 = ($168|0)==(0|0);
       if ($169) {
        $170 = (($v$0$i) + 16|0);
        $171 = HEAP32[$170>>2]|0;
        $172 = ($171|0)==(0|0);
        if ($172) {
         $R$1$i = 0;
         break;
        } else {
         $R$0$i = $171;$RP$0$i = $170;
        }
       } else {
        $R$0$i = $168;$RP$0$i = $167;
       }
       while(1) {
        $173 = (($R$0$i) + 20|0);
        $174 = HEAP32[$173>>2]|0;
        $175 = ($174|0)==(0|0);
        if (!($175)) {
         $R$0$i = $174;$RP$0$i = $173;
         continue;
        }
        $176 = (($R$0$i) + 16|0);
        $177 = HEAP32[$176>>2]|0;
        $178 = ($177|0)==(0|0);
        if ($178) {
         break;
        } else {
         $R$0$i = $177;$RP$0$i = $176;
        }
       }
       $179 = ($RP$0$i>>>0)<($149>>>0);
       if ($179) {
        _abort();
        // unreachable;
       } else {
        HEAP32[$RP$0$i>>2] = 0;
        $R$1$i = $R$0$i;
        break;
       }
      } else {
       $158 = (($v$0$i) + 8|0);
       $159 = HEAP32[$158>>2]|0;
       $160 = ($159>>>0)<($149>>>0);
       if ($160) {
        _abort();
        // unreachable;
       }
       $161 = (($159) + 12|0);
       $162 = HEAP32[$161>>2]|0;
       $163 = ($162|0)==($v$0$i|0);
       if (!($163)) {
        _abort();
        // unreachable;
       }
       $164 = (($156) + 8|0);
       $165 = HEAP32[$164>>2]|0;
       $166 = ($165|0)==($v$0$i|0);
       if ($166) {
        HEAP32[$161>>2] = $156;
        HEAP32[$164>>2] = $159;
        $R$1$i = $156;
        break;
       } else {
        _abort();
        // unreachable;
       }
      }
     } while(0);
     $180 = ($154|0)==(0|0);
     do {
      if (!($180)) {
       $181 = (($v$0$i) + 28|0);
       $182 = HEAP32[$181>>2]|0;
       $183 = ((832 + ($182<<2)|0) + 304|0);
       $184 = HEAP32[$183>>2]|0;
       $185 = ($v$0$i|0)==($184|0);
       if ($185) {
        HEAP32[$183>>2] = $R$1$i;
        $cond$i = ($R$1$i|0)==(0|0);
        if ($cond$i) {
         $186 = 1 << $182;
         $187 = $186 ^ -1;
         $188 = HEAP32[((832 + 4|0))>>2]|0;
         $189 = $188 & $187;
         HEAP32[((832 + 4|0))>>2] = $189;
         break;
        }
       } else {
        $190 = HEAP32[((832 + 16|0))>>2]|0;
        $191 = ($154>>>0)<($190>>>0);
        if ($191) {
         _abort();
         // unreachable;
        }
        $192 = (($154) + 16|0);
        $193 = HEAP32[$192>>2]|0;
        $194 = ($193|0)==($v$0$i|0);
        if ($194) {
         HEAP32[$192>>2] = $R$1$i;
        } else {
         $195 = (($154) + 20|0);
         HEAP32[$195>>2] = $R$1$i;
        }
        $196 = ($R$1$i|0)==(0|0);
        if ($196) {
         break;
        }
       }
       $197 = HEAP32[((832 + 16|0))>>2]|0;
       $198 = ($R$1$i>>>0)<($197>>>0);
       if ($198) {
        _abort();
        // unreachable;
       }
       $199 = (($R$1$i) + 24|0);
       HEAP32[$199>>2] = $154;
       $200 = (($v$0$i) + 16|0);
       $201 = HEAP32[$200>>2]|0;
       $202 = ($201|0)==(0|0);
       do {
        if (!($202)) {
         $203 = ($201>>>0)<($197>>>0);
         if ($203) {
          _abort();
          // unreachable;
         } else {
          $204 = (($R$1$i) + 16|0);
          HEAP32[$204>>2] = $201;
          $205 = (($201) + 24|0);
          HEAP32[$205>>2] = $R$1$i;
          break;
         }
        }
       } while(0);
       $206 = (($v$0$i) + 20|0);
       $207 = HEAP32[$206>>2]|0;
       $208 = ($207|0)==(0|0);
       if (!($208)) {
        $209 = HEAP32[((832 + 16|0))>>2]|0;
        $210 = ($207>>>0)<($209>>>0);
        if ($210) {
         _abort();
         // unreachable;
        } else {
         $211 = (($R$1$i) + 20|0);
         HEAP32[$211>>2] = $207;
         $212 = (($207) + 24|0);
         HEAP32[$212>>2] = $R$1$i;
         break;
        }
       }
      }
     } while(0);
     $213 = ($rsize$0$i>>>0)<(16);
     if ($213) {
      $214 = (($rsize$0$i) + ($5))|0;
      $215 = $214 | 3;
      $216 = (($v$0$i) + 4|0);
      HEAP32[$216>>2] = $215;
      $$sum4$i = (($214) + 4)|0;
      $217 = (($v$0$i) + ($$sum4$i)|0);
      $218 = HEAP32[$217>>2]|0;
      $219 = $218 | 1;
      HEAP32[$217>>2] = $219;
     } else {
      $220 = $5 | 3;
      $221 = (($v$0$i) + 4|0);
      HEAP32[$221>>2] = $220;
      $222 = $rsize$0$i | 1;
      $$sum$i39 = $5 | 4;
      $223 = (($v$0$i) + ($$sum$i39)|0);
      HEAP32[$223>>2] = $222;
      $$sum1$i = (($rsize$0$i) + ($5))|0;
      $224 = (($v$0$i) + ($$sum1$i)|0);
      HEAP32[$224>>2] = $rsize$0$i;
      $225 = HEAP32[((832 + 8|0))>>2]|0;
      $226 = ($225|0)==(0);
      if (!($226)) {
       $227 = HEAP32[((832 + 20|0))>>2]|0;
       $228 = $225 >>> 3;
       $229 = $228 << 1;
       $230 = ((832 + ($229<<2)|0) + 40|0);
       $231 = HEAP32[832>>2]|0;
       $232 = 1 << $228;
       $233 = $231 & $232;
       $234 = ($233|0)==(0);
       if ($234) {
        $235 = $231 | $232;
        HEAP32[832>>2] = $235;
        $$sum2$pre$i = (($229) + 2)|0;
        $$pre$i = ((832 + ($$sum2$pre$i<<2)|0) + 40|0);
        $$pre$phi$iZ2D = $$pre$i;$F1$0$i = $230;
       } else {
        $$sum3$i = (($229) + 2)|0;
        $236 = ((832 + ($$sum3$i<<2)|0) + 40|0);
        $237 = HEAP32[$236>>2]|0;
        $238 = HEAP32[((832 + 16|0))>>2]|0;
        $239 = ($237>>>0)<($238>>>0);
        if ($239) {
         _abort();
         // unreachable;
        } else {
         $$pre$phi$iZ2D = $236;$F1$0$i = $237;
        }
       }
       HEAP32[$$pre$phi$iZ2D>>2] = $227;
       $240 = (($F1$0$i) + 12|0);
       HEAP32[$240>>2] = $227;
       $241 = (($227) + 8|0);
       HEAP32[$241>>2] = $F1$0$i;
       $242 = (($227) + 12|0);
       HEAP32[$242>>2] = $230;
      }
      HEAP32[((832 + 8|0))>>2] = $rsize$0$i;
      HEAP32[((832 + 20|0))>>2] = $151;
     }
     $243 = (($v$0$i) + 8|0);
     $mem$0 = $243;
     STACKTOP = sp;return ($mem$0|0);
    }
   } else {
    $nb$0 = $5;
   }
  } else {
   $244 = ($bytes>>>0)>(4294967231);
   if ($244) {
    $nb$0 = -1;
   } else {
    $245 = (($bytes) + 11)|0;
    $246 = $245 & -8;
    $247 = HEAP32[((832 + 4|0))>>2]|0;
    $248 = ($247|0)==(0);
    if ($248) {
     $nb$0 = $246;
    } else {
     $249 = (0 - ($246))|0;
     $250 = $245 >>> 8;
     $251 = ($250|0)==(0);
     if ($251) {
      $idx$0$i = 0;
     } else {
      $252 = ($246>>>0)>(16777215);
      if ($252) {
       $idx$0$i = 31;
      } else {
       $253 = (($250) + 1048320)|0;
       $254 = $253 >>> 16;
       $255 = $254 & 8;
       $256 = $250 << $255;
       $257 = (($256) + 520192)|0;
       $258 = $257 >>> 16;
       $259 = $258 & 4;
       $260 = $259 | $255;
       $261 = $256 << $259;
       $262 = (($261) + 245760)|0;
       $263 = $262 >>> 16;
       $264 = $263 & 2;
       $265 = $260 | $264;
       $266 = (14 - ($265))|0;
       $267 = $261 << $264;
       $268 = $267 >>> 15;
       $269 = (($266) + ($268))|0;
       $270 = $269 << 1;
       $271 = (($269) + 7)|0;
       $272 = $246 >>> $271;
       $273 = $272 & 1;
       $274 = $273 | $270;
       $idx$0$i = $274;
      }
     }
     $275 = ((832 + ($idx$0$i<<2)|0) + 304|0);
     $276 = HEAP32[$275>>2]|0;
     $277 = ($276|0)==(0|0);
     L126: do {
      if ($277) {
       $rsize$2$i = $249;$t$1$i = 0;$v$2$i = 0;
      } else {
       $278 = ($idx$0$i|0)==(31);
       if ($278) {
        $282 = 0;
       } else {
        $279 = $idx$0$i >>> 1;
        $280 = (25 - ($279))|0;
        $282 = $280;
       }
       $281 = $246 << $282;
       $rsize$0$i15 = $249;$rst$0$i = 0;$sizebits$0$i = $281;$t$0$i14 = $276;$v$0$i16 = 0;
       while(1) {
        $283 = (($t$0$i14) + 4|0);
        $284 = HEAP32[$283>>2]|0;
        $285 = $284 & -8;
        $286 = (($285) - ($246))|0;
        $287 = ($286>>>0)<($rsize$0$i15>>>0);
        if ($287) {
         $288 = ($285|0)==($246|0);
         if ($288) {
          $rsize$2$i = $286;$t$1$i = $t$0$i14;$v$2$i = $t$0$i14;
          break L126;
         } else {
          $rsize$1$i = $286;$v$1$i = $t$0$i14;
         }
        } else {
         $rsize$1$i = $rsize$0$i15;$v$1$i = $v$0$i16;
        }
        $289 = (($t$0$i14) + 20|0);
        $290 = HEAP32[$289>>2]|0;
        $291 = $sizebits$0$i >>> 31;
        $292 = ((($t$0$i14) + ($291<<2)|0) + 16|0);
        $293 = HEAP32[$292>>2]|0;
        $294 = ($290|0)==(0|0);
        $295 = ($290|0)==($293|0);
        $or$cond19$i = $294 | $295;
        $rst$1$i = $or$cond19$i ? $rst$0$i : $290;
        $296 = ($293|0)==(0|0);
        $297 = $sizebits$0$i << 1;
        if ($296) {
         $rsize$2$i = $rsize$1$i;$t$1$i = $rst$1$i;$v$2$i = $v$1$i;
         break;
        } else {
         $rsize$0$i15 = $rsize$1$i;$rst$0$i = $rst$1$i;$sizebits$0$i = $297;$t$0$i14 = $293;$v$0$i16 = $v$1$i;
        }
       }
      }
     } while(0);
     $298 = ($t$1$i|0)==(0|0);
     $299 = ($v$2$i|0)==(0|0);
     $or$cond$i = $298 & $299;
     if ($or$cond$i) {
      $300 = 2 << $idx$0$i;
      $301 = (0 - ($300))|0;
      $302 = $300 | $301;
      $303 = $247 & $302;
      $304 = ($303|0)==(0);
      if ($304) {
       $nb$0 = $246;
       break;
      }
      $305 = (0 - ($303))|0;
      $306 = $303 & $305;
      $307 = (($306) + -1)|0;
      $308 = $307 >>> 12;
      $309 = $308 & 16;
      $310 = $307 >>> $309;
      $311 = $310 >>> 5;
      $312 = $311 & 8;
      $313 = $312 | $309;
      $314 = $310 >>> $312;
      $315 = $314 >>> 2;
      $316 = $315 & 4;
      $317 = $313 | $316;
      $318 = $314 >>> $316;
      $319 = $318 >>> 1;
      $320 = $319 & 2;
      $321 = $317 | $320;
      $322 = $318 >>> $320;
      $323 = $322 >>> 1;
      $324 = $323 & 1;
      $325 = $321 | $324;
      $326 = $322 >>> $324;
      $327 = (($325) + ($326))|0;
      $328 = ((832 + ($327<<2)|0) + 304|0);
      $329 = HEAP32[$328>>2]|0;
      $t$2$ph$i = $329;
     } else {
      $t$2$ph$i = $t$1$i;
     }
     $330 = ($t$2$ph$i|0)==(0|0);
     if ($330) {
      $rsize$3$lcssa$i = $rsize$2$i;$v$3$lcssa$i = $v$2$i;
     } else {
      $rsize$331$i = $rsize$2$i;$t$230$i = $t$2$ph$i;$v$332$i = $v$2$i;
      while(1) {
       $331 = (($t$230$i) + 4|0);
       $332 = HEAP32[$331>>2]|0;
       $333 = $332 & -8;
       $334 = (($333) - ($246))|0;
       $335 = ($334>>>0)<($rsize$331$i>>>0);
       $$rsize$3$i = $335 ? $334 : $rsize$331$i;
       $t$2$v$3$i = $335 ? $t$230$i : $v$332$i;
       $336 = (($t$230$i) + 16|0);
       $337 = HEAP32[$336>>2]|0;
       $338 = ($337|0)==(0|0);
       if (!($338)) {
        $rsize$331$i = $$rsize$3$i;$t$230$i = $337;$v$332$i = $t$2$v$3$i;
        continue;
       }
       $339 = (($t$230$i) + 20|0);
       $340 = HEAP32[$339>>2]|0;
       $341 = ($340|0)==(0|0);
       if ($341) {
        $rsize$3$lcssa$i = $$rsize$3$i;$v$3$lcssa$i = $t$2$v$3$i;
        break;
       } else {
        $rsize$331$i = $$rsize$3$i;$t$230$i = $340;$v$332$i = $t$2$v$3$i;
       }
      }
     }
     $342 = ($v$3$lcssa$i|0)==(0|0);
     if ($342) {
      $nb$0 = $246;
     } else {
      $343 = HEAP32[((832 + 8|0))>>2]|0;
      $344 = (($343) - ($246))|0;
      $345 = ($rsize$3$lcssa$i>>>0)<($344>>>0);
      if ($345) {
       $346 = HEAP32[((832 + 16|0))>>2]|0;
       $347 = ($v$3$lcssa$i>>>0)<($346>>>0);
       if ($347) {
        _abort();
        // unreachable;
       }
       $348 = (($v$3$lcssa$i) + ($246)|0);
       $349 = ($v$3$lcssa$i>>>0)<($348>>>0);
       if (!($349)) {
        _abort();
        // unreachable;
       }
       $350 = (($v$3$lcssa$i) + 24|0);
       $351 = HEAP32[$350>>2]|0;
       $352 = (($v$3$lcssa$i) + 12|0);
       $353 = HEAP32[$352>>2]|0;
       $354 = ($353|0)==($v$3$lcssa$i|0);
       do {
        if ($354) {
         $364 = (($v$3$lcssa$i) + 20|0);
         $365 = HEAP32[$364>>2]|0;
         $366 = ($365|0)==(0|0);
         if ($366) {
          $367 = (($v$3$lcssa$i) + 16|0);
          $368 = HEAP32[$367>>2]|0;
          $369 = ($368|0)==(0|0);
          if ($369) {
           $R$1$i20 = 0;
           break;
          } else {
           $R$0$i18 = $368;$RP$0$i17 = $367;
          }
         } else {
          $R$0$i18 = $365;$RP$0$i17 = $364;
         }
         while(1) {
          $370 = (($R$0$i18) + 20|0);
          $371 = HEAP32[$370>>2]|0;
          $372 = ($371|0)==(0|0);
          if (!($372)) {
           $R$0$i18 = $371;$RP$0$i17 = $370;
           continue;
          }
          $373 = (($R$0$i18) + 16|0);
          $374 = HEAP32[$373>>2]|0;
          $375 = ($374|0)==(0|0);
          if ($375) {
           break;
          } else {
           $R$0$i18 = $374;$RP$0$i17 = $373;
          }
         }
         $376 = ($RP$0$i17>>>0)<($346>>>0);
         if ($376) {
          _abort();
          // unreachable;
         } else {
          HEAP32[$RP$0$i17>>2] = 0;
          $R$1$i20 = $R$0$i18;
          break;
         }
        } else {
         $355 = (($v$3$lcssa$i) + 8|0);
         $356 = HEAP32[$355>>2]|0;
         $357 = ($356>>>0)<($346>>>0);
         if ($357) {
          _abort();
          // unreachable;
         }
         $358 = (($356) + 12|0);
         $359 = HEAP32[$358>>2]|0;
         $360 = ($359|0)==($v$3$lcssa$i|0);
         if (!($360)) {
          _abort();
          // unreachable;
         }
         $361 = (($353) + 8|0);
         $362 = HEAP32[$361>>2]|0;
         $363 = ($362|0)==($v$3$lcssa$i|0);
         if ($363) {
          HEAP32[$358>>2] = $353;
          HEAP32[$361>>2] = $356;
          $R$1$i20 = $353;
          break;
         } else {
          _abort();
          // unreachable;
         }
        }
       } while(0);
       $377 = ($351|0)==(0|0);
       do {
        if (!($377)) {
         $378 = (($v$3$lcssa$i) + 28|0);
         $379 = HEAP32[$378>>2]|0;
         $380 = ((832 + ($379<<2)|0) + 304|0);
         $381 = HEAP32[$380>>2]|0;
         $382 = ($v$3$lcssa$i|0)==($381|0);
         if ($382) {
          HEAP32[$380>>2] = $R$1$i20;
          $cond$i21 = ($R$1$i20|0)==(0|0);
          if ($cond$i21) {
           $383 = 1 << $379;
           $384 = $383 ^ -1;
           $385 = HEAP32[((832 + 4|0))>>2]|0;
           $386 = $385 & $384;
           HEAP32[((832 + 4|0))>>2] = $386;
           break;
          }
         } else {
          $387 = HEAP32[((832 + 16|0))>>2]|0;
          $388 = ($351>>>0)<($387>>>0);
          if ($388) {
           _abort();
           // unreachable;
          }
          $389 = (($351) + 16|0);
          $390 = HEAP32[$389>>2]|0;
          $391 = ($390|0)==($v$3$lcssa$i|0);
          if ($391) {
           HEAP32[$389>>2] = $R$1$i20;
          } else {
           $392 = (($351) + 20|0);
           HEAP32[$392>>2] = $R$1$i20;
          }
          $393 = ($R$1$i20|0)==(0|0);
          if ($393) {
           break;
          }
         }
         $394 = HEAP32[((832 + 16|0))>>2]|0;
         $395 = ($R$1$i20>>>0)<($394>>>0);
         if ($395) {
          _abort();
          // unreachable;
         }
         $396 = (($R$1$i20) + 24|0);
         HEAP32[$396>>2] = $351;
         $397 = (($v$3$lcssa$i) + 16|0);
         $398 = HEAP32[$397>>2]|0;
         $399 = ($398|0)==(0|0);
         do {
          if (!($399)) {
           $400 = ($398>>>0)<($394>>>0);
           if ($400) {
            _abort();
            // unreachable;
           } else {
            $401 = (($R$1$i20) + 16|0);
            HEAP32[$401>>2] = $398;
            $402 = (($398) + 24|0);
            HEAP32[$402>>2] = $R$1$i20;
            break;
           }
          }
         } while(0);
         $403 = (($v$3$lcssa$i) + 20|0);
         $404 = HEAP32[$403>>2]|0;
         $405 = ($404|0)==(0|0);
         if (!($405)) {
          $406 = HEAP32[((832 + 16|0))>>2]|0;
          $407 = ($404>>>0)<($406>>>0);
          if ($407) {
           _abort();
           // unreachable;
          } else {
           $408 = (($R$1$i20) + 20|0);
           HEAP32[$408>>2] = $404;
           $409 = (($404) + 24|0);
           HEAP32[$409>>2] = $R$1$i20;
           break;
          }
         }
        }
       } while(0);
       $410 = ($rsize$3$lcssa$i>>>0)<(16);
       L204: do {
        if ($410) {
         $411 = (($rsize$3$lcssa$i) + ($246))|0;
         $412 = $411 | 3;
         $413 = (($v$3$lcssa$i) + 4|0);
         HEAP32[$413>>2] = $412;
         $$sum18$i = (($411) + 4)|0;
         $414 = (($v$3$lcssa$i) + ($$sum18$i)|0);
         $415 = HEAP32[$414>>2]|0;
         $416 = $415 | 1;
         HEAP32[$414>>2] = $416;
        } else {
         $417 = $246 | 3;
         $418 = (($v$3$lcssa$i) + 4|0);
         HEAP32[$418>>2] = $417;
         $419 = $rsize$3$lcssa$i | 1;
         $$sum$i2338 = $246 | 4;
         $420 = (($v$3$lcssa$i) + ($$sum$i2338)|0);
         HEAP32[$420>>2] = $419;
         $$sum1$i24 = (($rsize$3$lcssa$i) + ($246))|0;
         $421 = (($v$3$lcssa$i) + ($$sum1$i24)|0);
         HEAP32[$421>>2] = $rsize$3$lcssa$i;
         $422 = $rsize$3$lcssa$i >>> 3;
         $423 = ($rsize$3$lcssa$i>>>0)<(256);
         if ($423) {
          $424 = $422 << 1;
          $425 = ((832 + ($424<<2)|0) + 40|0);
          $426 = HEAP32[832>>2]|0;
          $427 = 1 << $422;
          $428 = $426 & $427;
          $429 = ($428|0)==(0);
          do {
           if ($429) {
            $430 = $426 | $427;
            HEAP32[832>>2] = $430;
            $$sum14$pre$i = (($424) + 2)|0;
            $$pre$i25 = ((832 + ($$sum14$pre$i<<2)|0) + 40|0);
            $$pre$phi$i26Z2D = $$pre$i25;$F5$0$i = $425;
           } else {
            $$sum17$i = (($424) + 2)|0;
            $431 = ((832 + ($$sum17$i<<2)|0) + 40|0);
            $432 = HEAP32[$431>>2]|0;
            $433 = HEAP32[((832 + 16|0))>>2]|0;
            $434 = ($432>>>0)<($433>>>0);
            if (!($434)) {
             $$pre$phi$i26Z2D = $431;$F5$0$i = $432;
             break;
            }
            _abort();
            // unreachable;
           }
          } while(0);
          HEAP32[$$pre$phi$i26Z2D>>2] = $348;
          $435 = (($F5$0$i) + 12|0);
          HEAP32[$435>>2] = $348;
          $$sum15$i = (($246) + 8)|0;
          $436 = (($v$3$lcssa$i) + ($$sum15$i)|0);
          HEAP32[$436>>2] = $F5$0$i;
          $$sum16$i = (($246) + 12)|0;
          $437 = (($v$3$lcssa$i) + ($$sum16$i)|0);
          HEAP32[$437>>2] = $425;
          break;
         }
         $438 = $rsize$3$lcssa$i >>> 8;
         $439 = ($438|0)==(0);
         if ($439) {
          $I7$0$i = 0;
         } else {
          $440 = ($rsize$3$lcssa$i>>>0)>(16777215);
          if ($440) {
           $I7$0$i = 31;
          } else {
           $441 = (($438) + 1048320)|0;
           $442 = $441 >>> 16;
           $443 = $442 & 8;
           $444 = $438 << $443;
           $445 = (($444) + 520192)|0;
           $446 = $445 >>> 16;
           $447 = $446 & 4;
           $448 = $447 | $443;
           $449 = $444 << $447;
           $450 = (($449) + 245760)|0;
           $451 = $450 >>> 16;
           $452 = $451 & 2;
           $453 = $448 | $452;
           $454 = (14 - ($453))|0;
           $455 = $449 << $452;
           $456 = $455 >>> 15;
           $457 = (($454) + ($456))|0;
           $458 = $457 << 1;
           $459 = (($457) + 7)|0;
           $460 = $rsize$3$lcssa$i >>> $459;
           $461 = $460 & 1;
           $462 = $461 | $458;
           $I7$0$i = $462;
          }
         }
         $463 = ((832 + ($I7$0$i<<2)|0) + 304|0);
         $$sum2$i = (($246) + 28)|0;
         $464 = (($v$3$lcssa$i) + ($$sum2$i)|0);
         HEAP32[$464>>2] = $I7$0$i;
         $$sum3$i27 = (($246) + 16)|0;
         $465 = (($v$3$lcssa$i) + ($$sum3$i27)|0);
         $$sum4$i28 = (($246) + 20)|0;
         $466 = (($v$3$lcssa$i) + ($$sum4$i28)|0);
         HEAP32[$466>>2] = 0;
         HEAP32[$465>>2] = 0;
         $467 = HEAP32[((832 + 4|0))>>2]|0;
         $468 = 1 << $I7$0$i;
         $469 = $467 & $468;
         $470 = ($469|0)==(0);
         if ($470) {
          $471 = $467 | $468;
          HEAP32[((832 + 4|0))>>2] = $471;
          HEAP32[$463>>2] = $348;
          $$sum5$i = (($246) + 24)|0;
          $472 = (($v$3$lcssa$i) + ($$sum5$i)|0);
          HEAP32[$472>>2] = $463;
          $$sum6$i = (($246) + 12)|0;
          $473 = (($v$3$lcssa$i) + ($$sum6$i)|0);
          HEAP32[$473>>2] = $348;
          $$sum7$i = (($246) + 8)|0;
          $474 = (($v$3$lcssa$i) + ($$sum7$i)|0);
          HEAP32[$474>>2] = $348;
          break;
         }
         $475 = HEAP32[$463>>2]|0;
         $476 = ($I7$0$i|0)==(31);
         if ($476) {
          $484 = 0;
         } else {
          $477 = $I7$0$i >>> 1;
          $478 = (25 - ($477))|0;
          $484 = $478;
         }
         $479 = (($475) + 4|0);
         $480 = HEAP32[$479>>2]|0;
         $481 = $480 & -8;
         $482 = ($481|0)==($rsize$3$lcssa$i|0);
         L225: do {
          if ($482) {
           $T$0$lcssa$i = $475;
          } else {
           $483 = $rsize$3$lcssa$i << $484;
           $K12$027$i = $483;$T$026$i = $475;
           while(1) {
            $491 = $K12$027$i >>> 31;
            $492 = ((($T$026$i) + ($491<<2)|0) + 16|0);
            $487 = HEAP32[$492>>2]|0;
            $493 = ($487|0)==(0|0);
            if ($493) {
             break;
            }
            $485 = $K12$027$i << 1;
            $486 = (($487) + 4|0);
            $488 = HEAP32[$486>>2]|0;
            $489 = $488 & -8;
            $490 = ($489|0)==($rsize$3$lcssa$i|0);
            if ($490) {
             $T$0$lcssa$i = $487;
             break L225;
            } else {
             $K12$027$i = $485;$T$026$i = $487;
            }
           }
           $494 = HEAP32[((832 + 16|0))>>2]|0;
           $495 = ($492>>>0)<($494>>>0);
           if ($495) {
            _abort();
            // unreachable;
           } else {
            HEAP32[$492>>2] = $348;
            $$sum11$i = (($246) + 24)|0;
            $496 = (($v$3$lcssa$i) + ($$sum11$i)|0);
            HEAP32[$496>>2] = $T$026$i;
            $$sum12$i = (($246) + 12)|0;
            $497 = (($v$3$lcssa$i) + ($$sum12$i)|0);
            HEAP32[$497>>2] = $348;
            $$sum13$i = (($246) + 8)|0;
            $498 = (($v$3$lcssa$i) + ($$sum13$i)|0);
            HEAP32[$498>>2] = $348;
            break L204;
           }
          }
         } while(0);
         $499 = (($T$0$lcssa$i) + 8|0);
         $500 = HEAP32[$499>>2]|0;
         $501 = HEAP32[((832 + 16|0))>>2]|0;
         $502 = ($T$0$lcssa$i>>>0)>=($501>>>0);
         $503 = ($500>>>0)>=($501>>>0);
         $or$cond24$i = $502 & $503;
         if ($or$cond24$i) {
          $504 = (($500) + 12|0);
          HEAP32[$504>>2] = $348;
          HEAP32[$499>>2] = $348;
          $$sum8$i = (($246) + 8)|0;
          $505 = (($v$3$lcssa$i) + ($$sum8$i)|0);
          HEAP32[$505>>2] = $500;
          $$sum9$i = (($246) + 12)|0;
          $506 = (($v$3$lcssa$i) + ($$sum9$i)|0);
          HEAP32[$506>>2] = $T$0$lcssa$i;
          $$sum10$i = (($246) + 24)|0;
          $507 = (($v$3$lcssa$i) + ($$sum10$i)|0);
          HEAP32[$507>>2] = 0;
          break;
         } else {
          _abort();
          // unreachable;
         }
        }
       } while(0);
       $508 = (($v$3$lcssa$i) + 8|0);
       $mem$0 = $508;
       STACKTOP = sp;return ($mem$0|0);
      } else {
       $nb$0 = $246;
      }
     }
    }
   }
  }
 } while(0);
 $509 = HEAP32[((832 + 8|0))>>2]|0;
 $510 = ($509>>>0)<($nb$0>>>0);
 if (!($510)) {
  $511 = (($509) - ($nb$0))|0;
  $512 = HEAP32[((832 + 20|0))>>2]|0;
  $513 = ($511>>>0)>(15);
  if ($513) {
   $514 = (($512) + ($nb$0)|0);
   HEAP32[((832 + 20|0))>>2] = $514;
   HEAP32[((832 + 8|0))>>2] = $511;
   $515 = $511 | 1;
   $$sum2 = (($nb$0) + 4)|0;
   $516 = (($512) + ($$sum2)|0);
   HEAP32[$516>>2] = $515;
   $517 = (($512) + ($509)|0);
   HEAP32[$517>>2] = $511;
   $518 = $nb$0 | 3;
   $519 = (($512) + 4|0);
   HEAP32[$519>>2] = $518;
  } else {
   HEAP32[((832 + 8|0))>>2] = 0;
   HEAP32[((832 + 20|0))>>2] = 0;
   $520 = $509 | 3;
   $521 = (($512) + 4|0);
   HEAP32[$521>>2] = $520;
   $$sum1 = (($509) + 4)|0;
   $522 = (($512) + ($$sum1)|0);
   $523 = HEAP32[$522>>2]|0;
   $524 = $523 | 1;
   HEAP32[$522>>2] = $524;
  }
  $525 = (($512) + 8|0);
  $mem$0 = $525;
  STACKTOP = sp;return ($mem$0|0);
 }
 $526 = HEAP32[((832 + 12|0))>>2]|0;
 $527 = ($526>>>0)>($nb$0>>>0);
 if ($527) {
  $528 = (($526) - ($nb$0))|0;
  HEAP32[((832 + 12|0))>>2] = $528;
  $529 = HEAP32[((832 + 24|0))>>2]|0;
  $530 = (($529) + ($nb$0)|0);
  HEAP32[((832 + 24|0))>>2] = $530;
  $531 = $528 | 1;
  $$sum = (($nb$0) + 4)|0;
  $532 = (($529) + ($$sum)|0);
  HEAP32[$532>>2] = $531;
  $533 = $nb$0 | 3;
  $534 = (($529) + 4|0);
  HEAP32[$534>>2] = $533;
  $535 = (($529) + 8|0);
  $mem$0 = $535;
  STACKTOP = sp;return ($mem$0|0);
 }
 $536 = HEAP32[1304>>2]|0;
 $537 = ($536|0)==(0);
 do {
  if ($537) {
   $538 = (_sysconf(30)|0);
   $539 = (($538) + -1)|0;
   $540 = $539 & $538;
   $541 = ($540|0)==(0);
   if ($541) {
    HEAP32[((1304 + 8|0))>>2] = $538;
    HEAP32[((1304 + 4|0))>>2] = $538;
    HEAP32[((1304 + 12|0))>>2] = -1;
    HEAP32[((1304 + 16|0))>>2] = -1;
    HEAP32[((1304 + 20|0))>>2] = 0;
    HEAP32[((832 + 444|0))>>2] = 0;
    $542 = (_time((0|0))|0);
    $543 = $542 & -16;
    $544 = $543 ^ 1431655768;
    HEAP32[1304>>2] = $544;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $545 = (($nb$0) + 48)|0;
 $546 = HEAP32[((1304 + 8|0))>>2]|0;
 $547 = (($nb$0) + 47)|0;
 $548 = (($546) + ($547))|0;
 $549 = (0 - ($546))|0;
 $550 = $548 & $549;
 $551 = ($550>>>0)>($nb$0>>>0);
 if (!($551)) {
  $mem$0 = 0;
  STACKTOP = sp;return ($mem$0|0);
 }
 $552 = HEAP32[((832 + 440|0))>>2]|0;
 $553 = ($552|0)==(0);
 if (!($553)) {
  $554 = HEAP32[((832 + 432|0))>>2]|0;
  $555 = (($554) + ($550))|0;
  $556 = ($555>>>0)<=($554>>>0);
  $557 = ($555>>>0)>($552>>>0);
  $or$cond1$i = $556 | $557;
  if ($or$cond1$i) {
   $mem$0 = 0;
   STACKTOP = sp;return ($mem$0|0);
  }
 }
 $558 = HEAP32[((832 + 444|0))>>2]|0;
 $559 = $558 & 4;
 $560 = ($559|0)==(0);
 L266: do {
  if ($560) {
   $561 = HEAP32[((832 + 24|0))>>2]|0;
   $562 = ($561|0)==(0|0);
   L268: do {
    if ($562) {
     label = 181;
    } else {
     $sp$0$i$i = ((832 + 448|0));
     while(1) {
      $563 = HEAP32[$sp$0$i$i>>2]|0;
      $564 = ($563>>>0)>($561>>>0);
      if (!($564)) {
       $565 = (($sp$0$i$i) + 4|0);
       $566 = HEAP32[$565>>2]|0;
       $567 = (($563) + ($566)|0);
       $568 = ($567>>>0)>($561>>>0);
       if ($568) {
        break;
       }
      }
      $569 = (($sp$0$i$i) + 8|0);
      $570 = HEAP32[$569>>2]|0;
      $571 = ($570|0)==(0|0);
      if ($571) {
       label = 181;
       break L268;
      } else {
       $sp$0$i$i = $570;
      }
     }
     $572 = ($sp$0$i$i|0)==(0|0);
     if ($572) {
      label = 181;
     } else {
      $595 = HEAP32[((832 + 12|0))>>2]|0;
      $596 = (($548) - ($595))|0;
      $597 = $596 & $549;
      $598 = ($597>>>0)<(2147483647);
      if ($598) {
       $599 = (_sbrk(($597|0))|0);
       $600 = HEAP32[$sp$0$i$i>>2]|0;
       $601 = HEAP32[$565>>2]|0;
       $602 = (($600) + ($601)|0);
       $603 = ($599|0)==($602|0);
       if ($603) {
        $br$0$i = $599;$ssize$1$i = $597;
        label = 190;
       } else {
        $br$030$i = $599;$ssize$129$i = $597;
        label = 191;
       }
      } else {
       $tsize$03141$i = 0;
      }
     }
    }
   } while(0);
   do {
    if ((label|0) == 181) {
     $573 = (_sbrk(0)|0);
     $574 = ($573|0)==((-1)|0);
     if ($574) {
      $tsize$03141$i = 0;
     } else {
      $575 = $573;
      $576 = HEAP32[((1304 + 4|0))>>2]|0;
      $577 = (($576) + -1)|0;
      $578 = $577 & $575;
      $579 = ($578|0)==(0);
      if ($579) {
       $ssize$0$i = $550;
      } else {
       $580 = (($577) + ($575))|0;
       $581 = (0 - ($576))|0;
       $582 = $580 & $581;
       $583 = (($550) - ($575))|0;
       $584 = (($583) + ($582))|0;
       $ssize$0$i = $584;
      }
      $585 = HEAP32[((832 + 432|0))>>2]|0;
      $586 = (($585) + ($ssize$0$i))|0;
      $587 = ($ssize$0$i>>>0)>($nb$0>>>0);
      $588 = ($ssize$0$i>>>0)<(2147483647);
      $or$cond$i29 = $587 & $588;
      if ($or$cond$i29) {
       $589 = HEAP32[((832 + 440|0))>>2]|0;
       $590 = ($589|0)==(0);
       if (!($590)) {
        $591 = ($586>>>0)<=($585>>>0);
        $592 = ($586>>>0)>($589>>>0);
        $or$cond2$i = $591 | $592;
        if ($or$cond2$i) {
         $tsize$03141$i = 0;
         break;
        }
       }
       $593 = (_sbrk(($ssize$0$i|0))|0);
       $594 = ($593|0)==($573|0);
       if ($594) {
        $br$0$i = $573;$ssize$1$i = $ssize$0$i;
        label = 190;
       } else {
        $br$030$i = $593;$ssize$129$i = $ssize$0$i;
        label = 191;
       }
      } else {
       $tsize$03141$i = 0;
      }
     }
    }
   } while(0);
   L288: do {
    if ((label|0) == 190) {
     $604 = ($br$0$i|0)==((-1)|0);
     if ($604) {
      $tsize$03141$i = $ssize$1$i;
     } else {
      $tbase$245$i = $br$0$i;$tsize$244$i = $ssize$1$i;
      label = 201;
      break L266;
     }
    }
    else if ((label|0) == 191) {
     $605 = (0 - ($ssize$129$i))|0;
     $606 = ($br$030$i|0)!=((-1)|0);
     $607 = ($ssize$129$i>>>0)<(2147483647);
     $or$cond5$i = $606 & $607;
     $608 = ($545>>>0)>($ssize$129$i>>>0);
     $or$cond4$i = $or$cond5$i & $608;
     do {
      if ($or$cond4$i) {
       $609 = HEAP32[((1304 + 8|0))>>2]|0;
       $610 = (($547) - ($ssize$129$i))|0;
       $611 = (($610) + ($609))|0;
       $612 = (0 - ($609))|0;
       $613 = $611 & $612;
       $614 = ($613>>>0)<(2147483647);
       if ($614) {
        $615 = (_sbrk(($613|0))|0);
        $616 = ($615|0)==((-1)|0);
        if ($616) {
         (_sbrk(($605|0))|0);
         $tsize$03141$i = 0;
         break L288;
        } else {
         $617 = (($613) + ($ssize$129$i))|0;
         $ssize$2$i = $617;
         break;
        }
       } else {
        $ssize$2$i = $ssize$129$i;
       }
      } else {
       $ssize$2$i = $ssize$129$i;
      }
     } while(0);
     $618 = ($br$030$i|0)==((-1)|0);
     if ($618) {
      $tsize$03141$i = 0;
     } else {
      $tbase$245$i = $br$030$i;$tsize$244$i = $ssize$2$i;
      label = 201;
      break L266;
     }
    }
   } while(0);
   $619 = HEAP32[((832 + 444|0))>>2]|0;
   $620 = $619 | 4;
   HEAP32[((832 + 444|0))>>2] = $620;
   $tsize$1$i = $tsize$03141$i;
   label = 198;
  } else {
   $tsize$1$i = 0;
   label = 198;
  }
 } while(0);
 if ((label|0) == 198) {
  $621 = ($550>>>0)<(2147483647);
  if ($621) {
   $622 = (_sbrk(($550|0))|0);
   $623 = (_sbrk(0)|0);
   $624 = ($622|0)!=((-1)|0);
   $625 = ($623|0)!=((-1)|0);
   $or$cond3$i = $624 & $625;
   $626 = ($622>>>0)<($623>>>0);
   $or$cond6$i = $or$cond3$i & $626;
   if ($or$cond6$i) {
    $627 = $623;
    $628 = $622;
    $629 = (($627) - ($628))|0;
    $630 = (($nb$0) + 40)|0;
    $631 = ($629>>>0)>($630>>>0);
    $$tsize$1$i = $631 ? $629 : $tsize$1$i;
    if ($631) {
     $tbase$245$i = $622;$tsize$244$i = $$tsize$1$i;
     label = 201;
    }
   }
  }
 }
 if ((label|0) == 201) {
  $632 = HEAP32[((832 + 432|0))>>2]|0;
  $633 = (($632) + ($tsize$244$i))|0;
  HEAP32[((832 + 432|0))>>2] = $633;
  $634 = HEAP32[((832 + 436|0))>>2]|0;
  $635 = ($633>>>0)>($634>>>0);
  if ($635) {
   HEAP32[((832 + 436|0))>>2] = $633;
  }
  $636 = HEAP32[((832 + 24|0))>>2]|0;
  $637 = ($636|0)==(0|0);
  L308: do {
   if ($637) {
    $638 = HEAP32[((832 + 16|0))>>2]|0;
    $639 = ($638|0)==(0|0);
    $640 = ($tbase$245$i>>>0)<($638>>>0);
    $or$cond8$i = $639 | $640;
    if ($or$cond8$i) {
     HEAP32[((832 + 16|0))>>2] = $tbase$245$i;
    }
    HEAP32[((832 + 448|0))>>2] = $tbase$245$i;
    HEAP32[((832 + 452|0))>>2] = $tsize$244$i;
    HEAP32[((832 + 460|0))>>2] = 0;
    $641 = HEAP32[1304>>2]|0;
    HEAP32[((832 + 36|0))>>2] = $641;
    HEAP32[((832 + 32|0))>>2] = -1;
    $i$02$i$i = 0;
    while(1) {
     $642 = $i$02$i$i << 1;
     $643 = ((832 + ($642<<2)|0) + 40|0);
     $$sum$i$i = (($642) + 3)|0;
     $644 = ((832 + ($$sum$i$i<<2)|0) + 40|0);
     HEAP32[$644>>2] = $643;
     $$sum1$i$i = (($642) + 2)|0;
     $645 = ((832 + ($$sum1$i$i<<2)|0) + 40|0);
     HEAP32[$645>>2] = $643;
     $646 = (($i$02$i$i) + 1)|0;
     $exitcond$i$i = ($646|0)==(32);
     if ($exitcond$i$i) {
      break;
     } else {
      $i$02$i$i = $646;
     }
    }
    $647 = (($tsize$244$i) + -40)|0;
    $648 = (($tbase$245$i) + 8|0);
    $649 = $648;
    $650 = $649 & 7;
    $651 = ($650|0)==(0);
    if ($651) {
     $655 = 0;
    } else {
     $652 = (0 - ($649))|0;
     $653 = $652 & 7;
     $655 = $653;
    }
    $654 = (($tbase$245$i) + ($655)|0);
    $656 = (($647) - ($655))|0;
    HEAP32[((832 + 24|0))>>2] = $654;
    HEAP32[((832 + 12|0))>>2] = $656;
    $657 = $656 | 1;
    $$sum$i12$i = (($655) + 4)|0;
    $658 = (($tbase$245$i) + ($$sum$i12$i)|0);
    HEAP32[$658>>2] = $657;
    $$sum2$i$i = (($tsize$244$i) + -36)|0;
    $659 = (($tbase$245$i) + ($$sum2$i$i)|0);
    HEAP32[$659>>2] = 40;
    $660 = HEAP32[((1304 + 16|0))>>2]|0;
    HEAP32[((832 + 28|0))>>2] = $660;
   } else {
    $sp$073$i = ((832 + 448|0));
    while(1) {
     $661 = HEAP32[$sp$073$i>>2]|0;
     $662 = (($sp$073$i) + 4|0);
     $663 = HEAP32[$662>>2]|0;
     $664 = (($661) + ($663)|0);
     $665 = ($tbase$245$i|0)==($664|0);
     if ($665) {
      label = 213;
      break;
     }
     $666 = (($sp$073$i) + 8|0);
     $667 = HEAP32[$666>>2]|0;
     $668 = ($667|0)==(0|0);
     if ($668) {
      break;
     } else {
      $sp$073$i = $667;
     }
    }
    if ((label|0) == 213) {
     $669 = (($sp$073$i) + 12|0);
     $670 = HEAP32[$669>>2]|0;
     $671 = $670 & 8;
     $672 = ($671|0)==(0);
     if ($672) {
      $673 = ($636>>>0)>=($661>>>0);
      $674 = ($636>>>0)<($tbase$245$i>>>0);
      $or$cond47$i = $673 & $674;
      if ($or$cond47$i) {
       $675 = (($663) + ($tsize$244$i))|0;
       HEAP32[$662>>2] = $675;
       $676 = HEAP32[((832 + 12|0))>>2]|0;
       $677 = (($676) + ($tsize$244$i))|0;
       $678 = (($636) + 8|0);
       $679 = $678;
       $680 = $679 & 7;
       $681 = ($680|0)==(0);
       if ($681) {
        $685 = 0;
       } else {
        $682 = (0 - ($679))|0;
        $683 = $682 & 7;
        $685 = $683;
       }
       $684 = (($636) + ($685)|0);
       $686 = (($677) - ($685))|0;
       HEAP32[((832 + 24|0))>>2] = $684;
       HEAP32[((832 + 12|0))>>2] = $686;
       $687 = $686 | 1;
       $$sum$i16$i = (($685) + 4)|0;
       $688 = (($636) + ($$sum$i16$i)|0);
       HEAP32[$688>>2] = $687;
       $$sum2$i17$i = (($677) + 4)|0;
       $689 = (($636) + ($$sum2$i17$i)|0);
       HEAP32[$689>>2] = 40;
       $690 = HEAP32[((1304 + 16|0))>>2]|0;
       HEAP32[((832 + 28|0))>>2] = $690;
       break;
      }
     }
    }
    $691 = HEAP32[((832 + 16|0))>>2]|0;
    $692 = ($tbase$245$i>>>0)<($691>>>0);
    if ($692) {
     HEAP32[((832 + 16|0))>>2] = $tbase$245$i;
     $756 = $tbase$245$i;
    } else {
     $756 = $691;
    }
    $693 = (($tbase$245$i) + ($tsize$244$i)|0);
    $sp$166$i = ((832 + 448|0));
    while(1) {
     $694 = HEAP32[$sp$166$i>>2]|0;
     $695 = ($694|0)==($693|0);
     if ($695) {
      label = 223;
      break;
     }
     $696 = (($sp$166$i) + 8|0);
     $697 = HEAP32[$696>>2]|0;
     $698 = ($697|0)==(0|0);
     if ($698) {
      break;
     } else {
      $sp$166$i = $697;
     }
    }
    if ((label|0) == 223) {
     $699 = (($sp$166$i) + 12|0);
     $700 = HEAP32[$699>>2]|0;
     $701 = $700 & 8;
     $702 = ($701|0)==(0);
     if ($702) {
      HEAP32[$sp$166$i>>2] = $tbase$245$i;
      $703 = (($sp$166$i) + 4|0);
      $704 = HEAP32[$703>>2]|0;
      $705 = (($704) + ($tsize$244$i))|0;
      HEAP32[$703>>2] = $705;
      $706 = (($tbase$245$i) + 8|0);
      $707 = $706;
      $708 = $707 & 7;
      $709 = ($708|0)==(0);
      if ($709) {
       $713 = 0;
      } else {
       $710 = (0 - ($707))|0;
       $711 = $710 & 7;
       $713 = $711;
      }
      $712 = (($tbase$245$i) + ($713)|0);
      $$sum102$i = (($tsize$244$i) + 8)|0;
      $714 = (($tbase$245$i) + ($$sum102$i)|0);
      $715 = $714;
      $716 = $715 & 7;
      $717 = ($716|0)==(0);
      if ($717) {
       $720 = 0;
      } else {
       $718 = (0 - ($715))|0;
       $719 = $718 & 7;
       $720 = $719;
      }
      $$sum103$i = (($720) + ($tsize$244$i))|0;
      $721 = (($tbase$245$i) + ($$sum103$i)|0);
      $722 = $721;
      $723 = $712;
      $724 = (($722) - ($723))|0;
      $$sum$i19$i = (($713) + ($nb$0))|0;
      $725 = (($tbase$245$i) + ($$sum$i19$i)|0);
      $726 = (($724) - ($nb$0))|0;
      $727 = $nb$0 | 3;
      $$sum1$i20$i = (($713) + 4)|0;
      $728 = (($tbase$245$i) + ($$sum1$i20$i)|0);
      HEAP32[$728>>2] = $727;
      $729 = ($721|0)==($636|0);
      L345: do {
       if ($729) {
        $730 = HEAP32[((832 + 12|0))>>2]|0;
        $731 = (($730) + ($726))|0;
        HEAP32[((832 + 12|0))>>2] = $731;
        HEAP32[((832 + 24|0))>>2] = $725;
        $732 = $731 | 1;
        $$sum42$i$i = (($$sum$i19$i) + 4)|0;
        $733 = (($tbase$245$i) + ($$sum42$i$i)|0);
        HEAP32[$733>>2] = $732;
       } else {
        $734 = HEAP32[((832 + 20|0))>>2]|0;
        $735 = ($721|0)==($734|0);
        if ($735) {
         $736 = HEAP32[((832 + 8|0))>>2]|0;
         $737 = (($736) + ($726))|0;
         HEAP32[((832 + 8|0))>>2] = $737;
         HEAP32[((832 + 20|0))>>2] = $725;
         $738 = $737 | 1;
         $$sum40$i$i = (($$sum$i19$i) + 4)|0;
         $739 = (($tbase$245$i) + ($$sum40$i$i)|0);
         HEAP32[$739>>2] = $738;
         $$sum41$i$i = (($737) + ($$sum$i19$i))|0;
         $740 = (($tbase$245$i) + ($$sum41$i$i)|0);
         HEAP32[$740>>2] = $737;
         break;
        }
        $$sum2$i21$i = (($tsize$244$i) + 4)|0;
        $$sum104$i = (($$sum2$i21$i) + ($720))|0;
        $741 = (($tbase$245$i) + ($$sum104$i)|0);
        $742 = HEAP32[$741>>2]|0;
        $743 = $742 & 3;
        $744 = ($743|0)==(1);
        if ($744) {
         $745 = $742 & -8;
         $746 = $742 >>> 3;
         $747 = ($742>>>0)<(256);
         L353: do {
          if ($747) {
           $$sum3738$i$i = $720 | 8;
           $$sum114$i = (($$sum3738$i$i) + ($tsize$244$i))|0;
           $748 = (($tbase$245$i) + ($$sum114$i)|0);
           $749 = HEAP32[$748>>2]|0;
           $$sum39$i$i = (($tsize$244$i) + 12)|0;
           $$sum115$i = (($$sum39$i$i) + ($720))|0;
           $750 = (($tbase$245$i) + ($$sum115$i)|0);
           $751 = HEAP32[$750>>2]|0;
           $752 = $746 << 1;
           $753 = ((832 + ($752<<2)|0) + 40|0);
           $754 = ($749|0)==($753|0);
           do {
            if (!($754)) {
             $755 = ($749>>>0)<($756>>>0);
             if ($755) {
              _abort();
              // unreachable;
             }
             $757 = (($749) + 12|0);
             $758 = HEAP32[$757>>2]|0;
             $759 = ($758|0)==($721|0);
             if ($759) {
              break;
             }
             _abort();
             // unreachable;
            }
           } while(0);
           $760 = ($751|0)==($749|0);
           if ($760) {
            $761 = 1 << $746;
            $762 = $761 ^ -1;
            $763 = HEAP32[832>>2]|0;
            $764 = $763 & $762;
            HEAP32[832>>2] = $764;
            break;
           }
           $765 = ($751|0)==($753|0);
           do {
            if ($765) {
             $$pre58$i$i = (($751) + 8|0);
             $$pre$phi59$i$iZ2D = $$pre58$i$i;
            } else {
             $766 = ($751>>>0)<($756>>>0);
             if ($766) {
              _abort();
              // unreachable;
             }
             $767 = (($751) + 8|0);
             $768 = HEAP32[$767>>2]|0;
             $769 = ($768|0)==($721|0);
             if ($769) {
              $$pre$phi59$i$iZ2D = $767;
              break;
             }
             _abort();
             // unreachable;
            }
           } while(0);
           $770 = (($749) + 12|0);
           HEAP32[$770>>2] = $751;
           HEAP32[$$pre$phi59$i$iZ2D>>2] = $749;
          } else {
           $$sum34$i$i = $720 | 24;
           $$sum105$i = (($$sum34$i$i) + ($tsize$244$i))|0;
           $771 = (($tbase$245$i) + ($$sum105$i)|0);
           $772 = HEAP32[$771>>2]|0;
           $$sum5$i$i = (($tsize$244$i) + 12)|0;
           $$sum106$i = (($$sum5$i$i) + ($720))|0;
           $773 = (($tbase$245$i) + ($$sum106$i)|0);
           $774 = HEAP32[$773>>2]|0;
           $775 = ($774|0)==($721|0);
           do {
            if ($775) {
             $$sum67$i$i = $720 | 16;
             $$sum112$i = (($$sum2$i21$i) + ($$sum67$i$i))|0;
             $785 = (($tbase$245$i) + ($$sum112$i)|0);
             $786 = HEAP32[$785>>2]|0;
             $787 = ($786|0)==(0|0);
             if ($787) {
              $$sum113$i = (($$sum67$i$i) + ($tsize$244$i))|0;
              $788 = (($tbase$245$i) + ($$sum113$i)|0);
              $789 = HEAP32[$788>>2]|0;
              $790 = ($789|0)==(0|0);
              if ($790) {
               $R$1$i$i = 0;
               break;
              } else {
               $R$0$i$i = $789;$RP$0$i$i = $788;
              }
             } else {
              $R$0$i$i = $786;$RP$0$i$i = $785;
             }
             while(1) {
              $791 = (($R$0$i$i) + 20|0);
              $792 = HEAP32[$791>>2]|0;
              $793 = ($792|0)==(0|0);
              if (!($793)) {
               $R$0$i$i = $792;$RP$0$i$i = $791;
               continue;
              }
              $794 = (($R$0$i$i) + 16|0);
              $795 = HEAP32[$794>>2]|0;
              $796 = ($795|0)==(0|0);
              if ($796) {
               break;
              } else {
               $R$0$i$i = $795;$RP$0$i$i = $794;
              }
             }
             $797 = ($RP$0$i$i>>>0)<($756>>>0);
             if ($797) {
              _abort();
              // unreachable;
             } else {
              HEAP32[$RP$0$i$i>>2] = 0;
              $R$1$i$i = $R$0$i$i;
              break;
             }
            } else {
             $$sum3536$i$i = $720 | 8;
             $$sum107$i = (($$sum3536$i$i) + ($tsize$244$i))|0;
             $776 = (($tbase$245$i) + ($$sum107$i)|0);
             $777 = HEAP32[$776>>2]|0;
             $778 = ($777>>>0)<($756>>>0);
             if ($778) {
              _abort();
              // unreachable;
             }
             $779 = (($777) + 12|0);
             $780 = HEAP32[$779>>2]|0;
             $781 = ($780|0)==($721|0);
             if (!($781)) {
              _abort();
              // unreachable;
             }
             $782 = (($774) + 8|0);
             $783 = HEAP32[$782>>2]|0;
             $784 = ($783|0)==($721|0);
             if ($784) {
              HEAP32[$779>>2] = $774;
              HEAP32[$782>>2] = $777;
              $R$1$i$i = $774;
              break;
             } else {
              _abort();
              // unreachable;
             }
            }
           } while(0);
           $798 = ($772|0)==(0|0);
           if ($798) {
            break;
           }
           $$sum30$i$i = (($tsize$244$i) + 28)|0;
           $$sum108$i = (($$sum30$i$i) + ($720))|0;
           $799 = (($tbase$245$i) + ($$sum108$i)|0);
           $800 = HEAP32[$799>>2]|0;
           $801 = ((832 + ($800<<2)|0) + 304|0);
           $802 = HEAP32[$801>>2]|0;
           $803 = ($721|0)==($802|0);
           do {
            if ($803) {
             HEAP32[$801>>2] = $R$1$i$i;
             $cond$i$i = ($R$1$i$i|0)==(0|0);
             if (!($cond$i$i)) {
              break;
             }
             $804 = 1 << $800;
             $805 = $804 ^ -1;
             $806 = HEAP32[((832 + 4|0))>>2]|0;
             $807 = $806 & $805;
             HEAP32[((832 + 4|0))>>2] = $807;
             break L353;
            } else {
             $808 = HEAP32[((832 + 16|0))>>2]|0;
             $809 = ($772>>>0)<($808>>>0);
             if ($809) {
              _abort();
              // unreachable;
             }
             $810 = (($772) + 16|0);
             $811 = HEAP32[$810>>2]|0;
             $812 = ($811|0)==($721|0);
             if ($812) {
              HEAP32[$810>>2] = $R$1$i$i;
             } else {
              $813 = (($772) + 20|0);
              HEAP32[$813>>2] = $R$1$i$i;
             }
             $814 = ($R$1$i$i|0)==(0|0);
             if ($814) {
              break L353;
             }
            }
           } while(0);
           $815 = HEAP32[((832 + 16|0))>>2]|0;
           $816 = ($R$1$i$i>>>0)<($815>>>0);
           if ($816) {
            _abort();
            // unreachable;
           }
           $817 = (($R$1$i$i) + 24|0);
           HEAP32[$817>>2] = $772;
           $$sum3132$i$i = $720 | 16;
           $$sum109$i = (($$sum3132$i$i) + ($tsize$244$i))|0;
           $818 = (($tbase$245$i) + ($$sum109$i)|0);
           $819 = HEAP32[$818>>2]|0;
           $820 = ($819|0)==(0|0);
           do {
            if (!($820)) {
             $821 = ($819>>>0)<($815>>>0);
             if ($821) {
              _abort();
              // unreachable;
             } else {
              $822 = (($R$1$i$i) + 16|0);
              HEAP32[$822>>2] = $819;
              $823 = (($819) + 24|0);
              HEAP32[$823>>2] = $R$1$i$i;
              break;
             }
            }
           } while(0);
           $$sum110$i = (($$sum2$i21$i) + ($$sum3132$i$i))|0;
           $824 = (($tbase$245$i) + ($$sum110$i)|0);
           $825 = HEAP32[$824>>2]|0;
           $826 = ($825|0)==(0|0);
           if ($826) {
            break;
           }
           $827 = HEAP32[((832 + 16|0))>>2]|0;
           $828 = ($825>>>0)<($827>>>0);
           if ($828) {
            _abort();
            // unreachable;
           } else {
            $829 = (($R$1$i$i) + 20|0);
            HEAP32[$829>>2] = $825;
            $830 = (($825) + 24|0);
            HEAP32[$830>>2] = $R$1$i$i;
            break;
           }
          }
         } while(0);
         $$sum9$i$i = $745 | $720;
         $$sum111$i = (($$sum9$i$i) + ($tsize$244$i))|0;
         $831 = (($tbase$245$i) + ($$sum111$i)|0);
         $832 = (($745) + ($726))|0;
         $oldfirst$0$i$i = $831;$qsize$0$i$i = $832;
        } else {
         $oldfirst$0$i$i = $721;$qsize$0$i$i = $726;
        }
        $833 = (($oldfirst$0$i$i) + 4|0);
        $834 = HEAP32[$833>>2]|0;
        $835 = $834 & -2;
        HEAP32[$833>>2] = $835;
        $836 = $qsize$0$i$i | 1;
        $$sum10$i$i = (($$sum$i19$i) + 4)|0;
        $837 = (($tbase$245$i) + ($$sum10$i$i)|0);
        HEAP32[$837>>2] = $836;
        $$sum11$i22$i = (($qsize$0$i$i) + ($$sum$i19$i))|0;
        $838 = (($tbase$245$i) + ($$sum11$i22$i)|0);
        HEAP32[$838>>2] = $qsize$0$i$i;
        $839 = $qsize$0$i$i >>> 3;
        $840 = ($qsize$0$i$i>>>0)<(256);
        if ($840) {
         $841 = $839 << 1;
         $842 = ((832 + ($841<<2)|0) + 40|0);
         $843 = HEAP32[832>>2]|0;
         $844 = 1 << $839;
         $845 = $843 & $844;
         $846 = ($845|0)==(0);
         do {
          if ($846) {
           $847 = $843 | $844;
           HEAP32[832>>2] = $847;
           $$sum26$pre$i$i = (($841) + 2)|0;
           $$pre$i23$i = ((832 + ($$sum26$pre$i$i<<2)|0) + 40|0);
           $$pre$phi$i24$iZ2D = $$pre$i23$i;$F4$0$i$i = $842;
          } else {
           $$sum29$i$i = (($841) + 2)|0;
           $848 = ((832 + ($$sum29$i$i<<2)|0) + 40|0);
           $849 = HEAP32[$848>>2]|0;
           $850 = HEAP32[((832 + 16|0))>>2]|0;
           $851 = ($849>>>0)<($850>>>0);
           if (!($851)) {
            $$pre$phi$i24$iZ2D = $848;$F4$0$i$i = $849;
            break;
           }
           _abort();
           // unreachable;
          }
         } while(0);
         HEAP32[$$pre$phi$i24$iZ2D>>2] = $725;
         $852 = (($F4$0$i$i) + 12|0);
         HEAP32[$852>>2] = $725;
         $$sum27$i$i = (($$sum$i19$i) + 8)|0;
         $853 = (($tbase$245$i) + ($$sum27$i$i)|0);
         HEAP32[$853>>2] = $F4$0$i$i;
         $$sum28$i$i = (($$sum$i19$i) + 12)|0;
         $854 = (($tbase$245$i) + ($$sum28$i$i)|0);
         HEAP32[$854>>2] = $842;
         break;
        }
        $855 = $qsize$0$i$i >>> 8;
        $856 = ($855|0)==(0);
        do {
         if ($856) {
          $I7$0$i$i = 0;
         } else {
          $857 = ($qsize$0$i$i>>>0)>(16777215);
          if ($857) {
           $I7$0$i$i = 31;
           break;
          }
          $858 = (($855) + 1048320)|0;
          $859 = $858 >>> 16;
          $860 = $859 & 8;
          $861 = $855 << $860;
          $862 = (($861) + 520192)|0;
          $863 = $862 >>> 16;
          $864 = $863 & 4;
          $865 = $864 | $860;
          $866 = $861 << $864;
          $867 = (($866) + 245760)|0;
          $868 = $867 >>> 16;
          $869 = $868 & 2;
          $870 = $865 | $869;
          $871 = (14 - ($870))|0;
          $872 = $866 << $869;
          $873 = $872 >>> 15;
          $874 = (($871) + ($873))|0;
          $875 = $874 << 1;
          $876 = (($874) + 7)|0;
          $877 = $qsize$0$i$i >>> $876;
          $878 = $877 & 1;
          $879 = $878 | $875;
          $I7$0$i$i = $879;
         }
        } while(0);
        $880 = ((832 + ($I7$0$i$i<<2)|0) + 304|0);
        $$sum12$i$i = (($$sum$i19$i) + 28)|0;
        $881 = (($tbase$245$i) + ($$sum12$i$i)|0);
        HEAP32[$881>>2] = $I7$0$i$i;
        $$sum13$i$i = (($$sum$i19$i) + 16)|0;
        $882 = (($tbase$245$i) + ($$sum13$i$i)|0);
        $$sum14$i$i = (($$sum$i19$i) + 20)|0;
        $883 = (($tbase$245$i) + ($$sum14$i$i)|0);
        HEAP32[$883>>2] = 0;
        HEAP32[$882>>2] = 0;
        $884 = HEAP32[((832 + 4|0))>>2]|0;
        $885 = 1 << $I7$0$i$i;
        $886 = $884 & $885;
        $887 = ($886|0)==(0);
        if ($887) {
         $888 = $884 | $885;
         HEAP32[((832 + 4|0))>>2] = $888;
         HEAP32[$880>>2] = $725;
         $$sum15$i$i = (($$sum$i19$i) + 24)|0;
         $889 = (($tbase$245$i) + ($$sum15$i$i)|0);
         HEAP32[$889>>2] = $880;
         $$sum16$i$i = (($$sum$i19$i) + 12)|0;
         $890 = (($tbase$245$i) + ($$sum16$i$i)|0);
         HEAP32[$890>>2] = $725;
         $$sum17$i$i = (($$sum$i19$i) + 8)|0;
         $891 = (($tbase$245$i) + ($$sum17$i$i)|0);
         HEAP32[$891>>2] = $725;
         break;
        }
        $892 = HEAP32[$880>>2]|0;
        $893 = ($I7$0$i$i|0)==(31);
        if ($893) {
         $901 = 0;
        } else {
         $894 = $I7$0$i$i >>> 1;
         $895 = (25 - ($894))|0;
         $901 = $895;
        }
        $896 = (($892) + 4|0);
        $897 = HEAP32[$896>>2]|0;
        $898 = $897 & -8;
        $899 = ($898|0)==($qsize$0$i$i|0);
        L442: do {
         if ($899) {
          $T$0$lcssa$i26$i = $892;
         } else {
          $900 = $qsize$0$i$i << $901;
          $K8$053$i$i = $900;$T$052$i$i = $892;
          while(1) {
           $908 = $K8$053$i$i >>> 31;
           $909 = ((($T$052$i$i) + ($908<<2)|0) + 16|0);
           $904 = HEAP32[$909>>2]|0;
           $910 = ($904|0)==(0|0);
           if ($910) {
            break;
           }
           $902 = $K8$053$i$i << 1;
           $903 = (($904) + 4|0);
           $905 = HEAP32[$903>>2]|0;
           $906 = $905 & -8;
           $907 = ($906|0)==($qsize$0$i$i|0);
           if ($907) {
            $T$0$lcssa$i26$i = $904;
            break L442;
           } else {
            $K8$053$i$i = $902;$T$052$i$i = $904;
           }
          }
          $911 = HEAP32[((832 + 16|0))>>2]|0;
          $912 = ($909>>>0)<($911>>>0);
          if ($912) {
           _abort();
           // unreachable;
          } else {
           HEAP32[$909>>2] = $725;
           $$sum23$i$i = (($$sum$i19$i) + 24)|0;
           $913 = (($tbase$245$i) + ($$sum23$i$i)|0);
           HEAP32[$913>>2] = $T$052$i$i;
           $$sum24$i$i = (($$sum$i19$i) + 12)|0;
           $914 = (($tbase$245$i) + ($$sum24$i$i)|0);
           HEAP32[$914>>2] = $725;
           $$sum25$i$i = (($$sum$i19$i) + 8)|0;
           $915 = (($tbase$245$i) + ($$sum25$i$i)|0);
           HEAP32[$915>>2] = $725;
           break L345;
          }
         }
        } while(0);
        $916 = (($T$0$lcssa$i26$i) + 8|0);
        $917 = HEAP32[$916>>2]|0;
        $918 = HEAP32[((832 + 16|0))>>2]|0;
        $919 = ($T$0$lcssa$i26$i>>>0)>=($918>>>0);
        $920 = ($917>>>0)>=($918>>>0);
        $or$cond$i27$i = $919 & $920;
        if ($or$cond$i27$i) {
         $921 = (($917) + 12|0);
         HEAP32[$921>>2] = $725;
         HEAP32[$916>>2] = $725;
         $$sum20$i$i = (($$sum$i19$i) + 8)|0;
         $922 = (($tbase$245$i) + ($$sum20$i$i)|0);
         HEAP32[$922>>2] = $917;
         $$sum21$i$i = (($$sum$i19$i) + 12)|0;
         $923 = (($tbase$245$i) + ($$sum21$i$i)|0);
         HEAP32[$923>>2] = $T$0$lcssa$i26$i;
         $$sum22$i$i = (($$sum$i19$i) + 24)|0;
         $924 = (($tbase$245$i) + ($$sum22$i$i)|0);
         HEAP32[$924>>2] = 0;
         break;
        } else {
         _abort();
         // unreachable;
        }
       }
      } while(0);
      $$sum1819$i$i = $713 | 8;
      $925 = (($tbase$245$i) + ($$sum1819$i$i)|0);
      $mem$0 = $925;
      STACKTOP = sp;return ($mem$0|0);
     }
    }
    $sp$0$i$i$i = ((832 + 448|0));
    while(1) {
     $926 = HEAP32[$sp$0$i$i$i>>2]|0;
     $927 = ($926>>>0)>($636>>>0);
     if (!($927)) {
      $928 = (($sp$0$i$i$i) + 4|0);
      $929 = HEAP32[$928>>2]|0;
      $930 = (($926) + ($929)|0);
      $931 = ($930>>>0)>($636>>>0);
      if ($931) {
       break;
      }
     }
     $932 = (($sp$0$i$i$i) + 8|0);
     $933 = HEAP32[$932>>2]|0;
     $sp$0$i$i$i = $933;
    }
    $$sum$i13$i = (($929) + -47)|0;
    $$sum1$i14$i = (($929) + -39)|0;
    $934 = (($926) + ($$sum1$i14$i)|0);
    $935 = $934;
    $936 = $935 & 7;
    $937 = ($936|0)==(0);
    if ($937) {
     $940 = 0;
    } else {
     $938 = (0 - ($935))|0;
     $939 = $938 & 7;
     $940 = $939;
    }
    $$sum2$i15$i = (($$sum$i13$i) + ($940))|0;
    $941 = (($926) + ($$sum2$i15$i)|0);
    $942 = (($636) + 16|0);
    $943 = ($941>>>0)<($942>>>0);
    $944 = $943 ? $636 : $941;
    $945 = (($944) + 8|0);
    $946 = (($tsize$244$i) + -40)|0;
    $947 = (($tbase$245$i) + 8|0);
    $948 = $947;
    $949 = $948 & 7;
    $950 = ($949|0)==(0);
    if ($950) {
     $954 = 0;
    } else {
     $951 = (0 - ($948))|0;
     $952 = $951 & 7;
     $954 = $952;
    }
    $953 = (($tbase$245$i) + ($954)|0);
    $955 = (($946) - ($954))|0;
    HEAP32[((832 + 24|0))>>2] = $953;
    HEAP32[((832 + 12|0))>>2] = $955;
    $956 = $955 | 1;
    $$sum$i$i$i = (($954) + 4)|0;
    $957 = (($tbase$245$i) + ($$sum$i$i$i)|0);
    HEAP32[$957>>2] = $956;
    $$sum2$i$i$i = (($tsize$244$i) + -36)|0;
    $958 = (($tbase$245$i) + ($$sum2$i$i$i)|0);
    HEAP32[$958>>2] = 40;
    $959 = HEAP32[((1304 + 16|0))>>2]|0;
    HEAP32[((832 + 28|0))>>2] = $959;
    $960 = (($944) + 4|0);
    HEAP32[$960>>2] = 27;
    ;HEAP32[$945+0>>2]=HEAP32[((832 + 448|0))+0>>2]|0;HEAP32[$945+4>>2]=HEAP32[((832 + 448|0))+4>>2]|0;HEAP32[$945+8>>2]=HEAP32[((832 + 448|0))+8>>2]|0;HEAP32[$945+12>>2]=HEAP32[((832 + 448|0))+12>>2]|0;
    HEAP32[((832 + 448|0))>>2] = $tbase$245$i;
    HEAP32[((832 + 452|0))>>2] = $tsize$244$i;
    HEAP32[((832 + 460|0))>>2] = 0;
    HEAP32[((832 + 456|0))>>2] = $945;
    $961 = (($944) + 28|0);
    HEAP32[$961>>2] = 7;
    $962 = (($944) + 32|0);
    $963 = ($962>>>0)<($930>>>0);
    if ($963) {
     $965 = $961;
     while(1) {
      $964 = (($965) + 4|0);
      HEAP32[$964>>2] = 7;
      $966 = (($965) + 8|0);
      $967 = ($966>>>0)<($930>>>0);
      if ($967) {
       $965 = $964;
      } else {
       break;
      }
     }
    }
    $968 = ($944|0)==($636|0);
    if (!($968)) {
     $969 = $944;
     $970 = $636;
     $971 = (($969) - ($970))|0;
     $972 = (($636) + ($971)|0);
     $$sum3$i$i = (($971) + 4)|0;
     $973 = (($636) + ($$sum3$i$i)|0);
     $974 = HEAP32[$973>>2]|0;
     $975 = $974 & -2;
     HEAP32[$973>>2] = $975;
     $976 = $971 | 1;
     $977 = (($636) + 4|0);
     HEAP32[$977>>2] = $976;
     HEAP32[$972>>2] = $971;
     $978 = $971 >>> 3;
     $979 = ($971>>>0)<(256);
     if ($979) {
      $980 = $978 << 1;
      $981 = ((832 + ($980<<2)|0) + 40|0);
      $982 = HEAP32[832>>2]|0;
      $983 = 1 << $978;
      $984 = $982 & $983;
      $985 = ($984|0)==(0);
      do {
       if ($985) {
        $986 = $982 | $983;
        HEAP32[832>>2] = $986;
        $$sum10$pre$i$i = (($980) + 2)|0;
        $$pre$i$i = ((832 + ($$sum10$pre$i$i<<2)|0) + 40|0);
        $$pre$phi$i$iZ2D = $$pre$i$i;$F$0$i$i = $981;
       } else {
        $$sum11$i$i = (($980) + 2)|0;
        $987 = ((832 + ($$sum11$i$i<<2)|0) + 40|0);
        $988 = HEAP32[$987>>2]|0;
        $989 = HEAP32[((832 + 16|0))>>2]|0;
        $990 = ($988>>>0)<($989>>>0);
        if (!($990)) {
         $$pre$phi$i$iZ2D = $987;$F$0$i$i = $988;
         break;
        }
        _abort();
        // unreachable;
       }
      } while(0);
      HEAP32[$$pre$phi$i$iZ2D>>2] = $636;
      $991 = (($F$0$i$i) + 12|0);
      HEAP32[$991>>2] = $636;
      $992 = (($636) + 8|0);
      HEAP32[$992>>2] = $F$0$i$i;
      $993 = (($636) + 12|0);
      HEAP32[$993>>2] = $981;
      break;
     }
     $994 = $971 >>> 8;
     $995 = ($994|0)==(0);
     if ($995) {
      $I1$0$i$i = 0;
     } else {
      $996 = ($971>>>0)>(16777215);
      if ($996) {
       $I1$0$i$i = 31;
      } else {
       $997 = (($994) + 1048320)|0;
       $998 = $997 >>> 16;
       $999 = $998 & 8;
       $1000 = $994 << $999;
       $1001 = (($1000) + 520192)|0;
       $1002 = $1001 >>> 16;
       $1003 = $1002 & 4;
       $1004 = $1003 | $999;
       $1005 = $1000 << $1003;
       $1006 = (($1005) + 245760)|0;
       $1007 = $1006 >>> 16;
       $1008 = $1007 & 2;
       $1009 = $1004 | $1008;
       $1010 = (14 - ($1009))|0;
       $1011 = $1005 << $1008;
       $1012 = $1011 >>> 15;
       $1013 = (($1010) + ($1012))|0;
       $1014 = $1013 << 1;
       $1015 = (($1013) + 7)|0;
       $1016 = $971 >>> $1015;
       $1017 = $1016 & 1;
       $1018 = $1017 | $1014;
       $I1$0$i$i = $1018;
      }
     }
     $1019 = ((832 + ($I1$0$i$i<<2)|0) + 304|0);
     $1020 = (($636) + 28|0);
     $I1$0$c$i$i = $I1$0$i$i;
     HEAP32[$1020>>2] = $I1$0$c$i$i;
     $1021 = (($636) + 20|0);
     HEAP32[$1021>>2] = 0;
     $1022 = (($636) + 16|0);
     HEAP32[$1022>>2] = 0;
     $1023 = HEAP32[((832 + 4|0))>>2]|0;
     $1024 = 1 << $I1$0$i$i;
     $1025 = $1023 & $1024;
     $1026 = ($1025|0)==(0);
     if ($1026) {
      $1027 = $1023 | $1024;
      HEAP32[((832 + 4|0))>>2] = $1027;
      HEAP32[$1019>>2] = $636;
      $1028 = (($636) + 24|0);
      HEAP32[$1028>>2] = $1019;
      $1029 = (($636) + 12|0);
      HEAP32[$1029>>2] = $636;
      $1030 = (($636) + 8|0);
      HEAP32[$1030>>2] = $636;
      break;
     }
     $1031 = HEAP32[$1019>>2]|0;
     $1032 = ($I1$0$i$i|0)==(31);
     if ($1032) {
      $1040 = 0;
     } else {
      $1033 = $I1$0$i$i >>> 1;
      $1034 = (25 - ($1033))|0;
      $1040 = $1034;
     }
     $1035 = (($1031) + 4|0);
     $1036 = HEAP32[$1035>>2]|0;
     $1037 = $1036 & -8;
     $1038 = ($1037|0)==($971|0);
     L493: do {
      if ($1038) {
       $T$0$lcssa$i$i = $1031;
      } else {
       $1039 = $971 << $1040;
       $K2$015$i$i = $1039;$T$014$i$i = $1031;
       while(1) {
        $1047 = $K2$015$i$i >>> 31;
        $1048 = ((($T$014$i$i) + ($1047<<2)|0) + 16|0);
        $1043 = HEAP32[$1048>>2]|0;
        $1049 = ($1043|0)==(0|0);
        if ($1049) {
         break;
        }
        $1041 = $K2$015$i$i << 1;
        $1042 = (($1043) + 4|0);
        $1044 = HEAP32[$1042>>2]|0;
        $1045 = $1044 & -8;
        $1046 = ($1045|0)==($971|0);
        if ($1046) {
         $T$0$lcssa$i$i = $1043;
         break L493;
        } else {
         $K2$015$i$i = $1041;$T$014$i$i = $1043;
        }
       }
       $1050 = HEAP32[((832 + 16|0))>>2]|0;
       $1051 = ($1048>>>0)<($1050>>>0);
       if ($1051) {
        _abort();
        // unreachable;
       } else {
        HEAP32[$1048>>2] = $636;
        $1052 = (($636) + 24|0);
        HEAP32[$1052>>2] = $T$014$i$i;
        $1053 = (($636) + 12|0);
        HEAP32[$1053>>2] = $636;
        $1054 = (($636) + 8|0);
        HEAP32[$1054>>2] = $636;
        break L308;
       }
      }
     } while(0);
     $1055 = (($T$0$lcssa$i$i) + 8|0);
     $1056 = HEAP32[$1055>>2]|0;
     $1057 = HEAP32[((832 + 16|0))>>2]|0;
     $1058 = ($T$0$lcssa$i$i>>>0)>=($1057>>>0);
     $1059 = ($1056>>>0)>=($1057>>>0);
     $or$cond$i$i = $1058 & $1059;
     if ($or$cond$i$i) {
      $1060 = (($1056) + 12|0);
      HEAP32[$1060>>2] = $636;
      HEAP32[$1055>>2] = $636;
      $1061 = (($636) + 8|0);
      HEAP32[$1061>>2] = $1056;
      $1062 = (($636) + 12|0);
      HEAP32[$1062>>2] = $T$0$lcssa$i$i;
      $1063 = (($636) + 24|0);
      HEAP32[$1063>>2] = 0;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   }
  } while(0);
  $1064 = HEAP32[((832 + 12|0))>>2]|0;
  $1065 = ($1064>>>0)>($nb$0>>>0);
  if ($1065) {
   $1066 = (($1064) - ($nb$0))|0;
   HEAP32[((832 + 12|0))>>2] = $1066;
   $1067 = HEAP32[((832 + 24|0))>>2]|0;
   $1068 = (($1067) + ($nb$0)|0);
   HEAP32[((832 + 24|0))>>2] = $1068;
   $1069 = $1066 | 1;
   $$sum$i32 = (($nb$0) + 4)|0;
   $1070 = (($1067) + ($$sum$i32)|0);
   HEAP32[$1070>>2] = $1069;
   $1071 = $nb$0 | 3;
   $1072 = (($1067) + 4|0);
   HEAP32[$1072>>2] = $1071;
   $1073 = (($1067) + 8|0);
   $mem$0 = $1073;
   STACKTOP = sp;return ($mem$0|0);
  }
 }
 $1074 = (___errno_location()|0);
 HEAP32[$1074>>2] = 12;
 $mem$0 = 0;
 STACKTOP = sp;return ($mem$0|0);
}
function _free($mem) {
 $mem = $mem|0;
 var $$pre = 0, $$pre$phi66Z2D = 0, $$pre$phi68Z2D = 0, $$pre$phiZ2D = 0, $$pre65 = 0, $$pre67 = 0, $$sum = 0, $$sum16$pre = 0, $$sum17 = 0, $$sum18 = 0, $$sum19 = 0, $$sum2 = 0, $$sum20 = 0, $$sum2324 = 0, $$sum25 = 0, $$sum26 = 0, $$sum28 = 0, $$sum29 = 0, $$sum3 = 0, $$sum30 = 0;
 var $$sum31 = 0, $$sum32 = 0, $$sum33 = 0, $$sum34 = 0, $$sum35 = 0, $$sum36 = 0, $$sum37 = 0, $$sum5 = 0, $$sum67 = 0, $$sum8 = 0, $$sum9 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0;
 var $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0;
 var $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0;
 var $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0;
 var $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0;
 var $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0;
 var $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0;
 var $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0;
 var $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0;
 var $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0;
 var $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0;
 var $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0;
 var $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0;
 var $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0;
 var $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0;
 var $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0;
 var $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $F16$0 = 0, $I18$0 = 0, $I18$0$c = 0, $K19$058 = 0, $R$0 = 0, $R$1 = 0, $R7$0 = 0;
 var $R7$1 = 0, $RP$0 = 0, $RP9$0 = 0, $T$0$lcssa = 0, $T$057 = 0, $cond = 0, $cond54 = 0, $or$cond = 0, $p$0 = 0, $psize$0 = 0, $psize$1 = 0, $sp$0$i = 0, $sp$0$in$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($mem|0)==(0|0);
 if ($0) {
  STACKTOP = sp;return;
 }
 $1 = (($mem) + -8|0);
 $2 = HEAP32[((832 + 16|0))>>2]|0;
 $3 = ($1>>>0)<($2>>>0);
 if ($3) {
  _abort();
  // unreachable;
 }
 $4 = (($mem) + -4|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = $5 & 3;
 $7 = ($6|0)==(1);
 if ($7) {
  _abort();
  // unreachable;
 }
 $8 = $5 & -8;
 $$sum = (($8) + -8)|0;
 $9 = (($mem) + ($$sum)|0);
 $10 = $5 & 1;
 $11 = ($10|0)==(0);
 do {
  if ($11) {
   $12 = HEAP32[$1>>2]|0;
   $13 = ($6|0)==(0);
   if ($13) {
    STACKTOP = sp;return;
   }
   $$sum2 = (-8 - ($12))|0;
   $14 = (($mem) + ($$sum2)|0);
   $15 = (($12) + ($8))|0;
   $16 = ($14>>>0)<($2>>>0);
   if ($16) {
    _abort();
    // unreachable;
   }
   $17 = HEAP32[((832 + 20|0))>>2]|0;
   $18 = ($14|0)==($17|0);
   if ($18) {
    $$sum3 = (($8) + -4)|0;
    $103 = (($mem) + ($$sum3)|0);
    $104 = HEAP32[$103>>2]|0;
    $105 = $104 & 3;
    $106 = ($105|0)==(3);
    if (!($106)) {
     $p$0 = $14;$psize$0 = $15;
     break;
    }
    HEAP32[((832 + 8|0))>>2] = $15;
    $107 = $104 & -2;
    HEAP32[$103>>2] = $107;
    $108 = $15 | 1;
    $$sum26 = (($$sum2) + 4)|0;
    $109 = (($mem) + ($$sum26)|0);
    HEAP32[$109>>2] = $108;
    HEAP32[$9>>2] = $15;
    STACKTOP = sp;return;
   }
   $19 = $12 >>> 3;
   $20 = ($12>>>0)<(256);
   if ($20) {
    $$sum36 = (($$sum2) + 8)|0;
    $21 = (($mem) + ($$sum36)|0);
    $22 = HEAP32[$21>>2]|0;
    $$sum37 = (($$sum2) + 12)|0;
    $23 = (($mem) + ($$sum37)|0);
    $24 = HEAP32[$23>>2]|0;
    $25 = $19 << 1;
    $26 = ((832 + ($25<<2)|0) + 40|0);
    $27 = ($22|0)==($26|0);
    if (!($27)) {
     $28 = ($22>>>0)<($2>>>0);
     if ($28) {
      _abort();
      // unreachable;
     }
     $29 = (($22) + 12|0);
     $30 = HEAP32[$29>>2]|0;
     $31 = ($30|0)==($14|0);
     if (!($31)) {
      _abort();
      // unreachable;
     }
    }
    $32 = ($24|0)==($22|0);
    if ($32) {
     $33 = 1 << $19;
     $34 = $33 ^ -1;
     $35 = HEAP32[832>>2]|0;
     $36 = $35 & $34;
     HEAP32[832>>2] = $36;
     $p$0 = $14;$psize$0 = $15;
     break;
    }
    $37 = ($24|0)==($26|0);
    if ($37) {
     $$pre67 = (($24) + 8|0);
     $$pre$phi68Z2D = $$pre67;
    } else {
     $38 = ($24>>>0)<($2>>>0);
     if ($38) {
      _abort();
      // unreachable;
     }
     $39 = (($24) + 8|0);
     $40 = HEAP32[$39>>2]|0;
     $41 = ($40|0)==($14|0);
     if ($41) {
      $$pre$phi68Z2D = $39;
     } else {
      _abort();
      // unreachable;
     }
    }
    $42 = (($22) + 12|0);
    HEAP32[$42>>2] = $24;
    HEAP32[$$pre$phi68Z2D>>2] = $22;
    $p$0 = $14;$psize$0 = $15;
    break;
   }
   $$sum28 = (($$sum2) + 24)|0;
   $43 = (($mem) + ($$sum28)|0);
   $44 = HEAP32[$43>>2]|0;
   $$sum29 = (($$sum2) + 12)|0;
   $45 = (($mem) + ($$sum29)|0);
   $46 = HEAP32[$45>>2]|0;
   $47 = ($46|0)==($14|0);
   do {
    if ($47) {
     $$sum31 = (($$sum2) + 20)|0;
     $57 = (($mem) + ($$sum31)|0);
     $58 = HEAP32[$57>>2]|0;
     $59 = ($58|0)==(0|0);
     if ($59) {
      $$sum30 = (($$sum2) + 16)|0;
      $60 = (($mem) + ($$sum30)|0);
      $61 = HEAP32[$60>>2]|0;
      $62 = ($61|0)==(0|0);
      if ($62) {
       $R$1 = 0;
       break;
      } else {
       $R$0 = $61;$RP$0 = $60;
      }
     } else {
      $R$0 = $58;$RP$0 = $57;
     }
     while(1) {
      $63 = (($R$0) + 20|0);
      $64 = HEAP32[$63>>2]|0;
      $65 = ($64|0)==(0|0);
      if (!($65)) {
       $R$0 = $64;$RP$0 = $63;
       continue;
      }
      $66 = (($R$0) + 16|0);
      $67 = HEAP32[$66>>2]|0;
      $68 = ($67|0)==(0|0);
      if ($68) {
       break;
      } else {
       $R$0 = $67;$RP$0 = $66;
      }
     }
     $69 = ($RP$0>>>0)<($2>>>0);
     if ($69) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$RP$0>>2] = 0;
      $R$1 = $R$0;
      break;
     }
    } else {
     $$sum35 = (($$sum2) + 8)|0;
     $48 = (($mem) + ($$sum35)|0);
     $49 = HEAP32[$48>>2]|0;
     $50 = ($49>>>0)<($2>>>0);
     if ($50) {
      _abort();
      // unreachable;
     }
     $51 = (($49) + 12|0);
     $52 = HEAP32[$51>>2]|0;
     $53 = ($52|0)==($14|0);
     if (!($53)) {
      _abort();
      // unreachable;
     }
     $54 = (($46) + 8|0);
     $55 = HEAP32[$54>>2]|0;
     $56 = ($55|0)==($14|0);
     if ($56) {
      HEAP32[$51>>2] = $46;
      HEAP32[$54>>2] = $49;
      $R$1 = $46;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   } while(0);
   $70 = ($44|0)==(0|0);
   if ($70) {
    $p$0 = $14;$psize$0 = $15;
   } else {
    $$sum32 = (($$sum2) + 28)|0;
    $71 = (($mem) + ($$sum32)|0);
    $72 = HEAP32[$71>>2]|0;
    $73 = ((832 + ($72<<2)|0) + 304|0);
    $74 = HEAP32[$73>>2]|0;
    $75 = ($14|0)==($74|0);
    if ($75) {
     HEAP32[$73>>2] = $R$1;
     $cond = ($R$1|0)==(0|0);
     if ($cond) {
      $76 = 1 << $72;
      $77 = $76 ^ -1;
      $78 = HEAP32[((832 + 4|0))>>2]|0;
      $79 = $78 & $77;
      HEAP32[((832 + 4|0))>>2] = $79;
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    } else {
     $80 = HEAP32[((832 + 16|0))>>2]|0;
     $81 = ($44>>>0)<($80>>>0);
     if ($81) {
      _abort();
      // unreachable;
     }
     $82 = (($44) + 16|0);
     $83 = HEAP32[$82>>2]|0;
     $84 = ($83|0)==($14|0);
     if ($84) {
      HEAP32[$82>>2] = $R$1;
     } else {
      $85 = (($44) + 20|0);
      HEAP32[$85>>2] = $R$1;
     }
     $86 = ($R$1|0)==(0|0);
     if ($86) {
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    }
    $87 = HEAP32[((832 + 16|0))>>2]|0;
    $88 = ($R$1>>>0)<($87>>>0);
    if ($88) {
     _abort();
     // unreachable;
    }
    $89 = (($R$1) + 24|0);
    HEAP32[$89>>2] = $44;
    $$sum33 = (($$sum2) + 16)|0;
    $90 = (($mem) + ($$sum33)|0);
    $91 = HEAP32[$90>>2]|0;
    $92 = ($91|0)==(0|0);
    do {
     if (!($92)) {
      $93 = ($91>>>0)<($87>>>0);
      if ($93) {
       _abort();
       // unreachable;
      } else {
       $94 = (($R$1) + 16|0);
       HEAP32[$94>>2] = $91;
       $95 = (($91) + 24|0);
       HEAP32[$95>>2] = $R$1;
       break;
      }
     }
    } while(0);
    $$sum34 = (($$sum2) + 20)|0;
    $96 = (($mem) + ($$sum34)|0);
    $97 = HEAP32[$96>>2]|0;
    $98 = ($97|0)==(0|0);
    if ($98) {
     $p$0 = $14;$psize$0 = $15;
    } else {
     $99 = HEAP32[((832 + 16|0))>>2]|0;
     $100 = ($97>>>0)<($99>>>0);
     if ($100) {
      _abort();
      // unreachable;
     } else {
      $101 = (($R$1) + 20|0);
      HEAP32[$101>>2] = $97;
      $102 = (($97) + 24|0);
      HEAP32[$102>>2] = $R$1;
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    }
   }
  } else {
   $p$0 = $1;$psize$0 = $8;
  }
 } while(0);
 $110 = ($p$0>>>0)<($9>>>0);
 if (!($110)) {
  _abort();
  // unreachable;
 }
 $$sum25 = (($8) + -4)|0;
 $111 = (($mem) + ($$sum25)|0);
 $112 = HEAP32[$111>>2]|0;
 $113 = $112 & 1;
 $114 = ($113|0)==(0);
 if ($114) {
  _abort();
  // unreachable;
 }
 $115 = $112 & 2;
 $116 = ($115|0)==(0);
 if ($116) {
  $117 = HEAP32[((832 + 24|0))>>2]|0;
  $118 = ($9|0)==($117|0);
  if ($118) {
   $119 = HEAP32[((832 + 12|0))>>2]|0;
   $120 = (($119) + ($psize$0))|0;
   HEAP32[((832 + 12|0))>>2] = $120;
   HEAP32[((832 + 24|0))>>2] = $p$0;
   $121 = $120 | 1;
   $122 = (($p$0) + 4|0);
   HEAP32[$122>>2] = $121;
   $123 = HEAP32[((832 + 20|0))>>2]|0;
   $124 = ($p$0|0)==($123|0);
   if (!($124)) {
    STACKTOP = sp;return;
   }
   HEAP32[((832 + 20|0))>>2] = 0;
   HEAP32[((832 + 8|0))>>2] = 0;
   STACKTOP = sp;return;
  }
  $125 = HEAP32[((832 + 20|0))>>2]|0;
  $126 = ($9|0)==($125|0);
  if ($126) {
   $127 = HEAP32[((832 + 8|0))>>2]|0;
   $128 = (($127) + ($psize$0))|0;
   HEAP32[((832 + 8|0))>>2] = $128;
   HEAP32[((832 + 20|0))>>2] = $p$0;
   $129 = $128 | 1;
   $130 = (($p$0) + 4|0);
   HEAP32[$130>>2] = $129;
   $131 = (($p$0) + ($128)|0);
   HEAP32[$131>>2] = $128;
   STACKTOP = sp;return;
  }
  $132 = $112 & -8;
  $133 = (($132) + ($psize$0))|0;
  $134 = $112 >>> 3;
  $135 = ($112>>>0)<(256);
  do {
   if ($135) {
    $136 = (($mem) + ($8)|0);
    $137 = HEAP32[$136>>2]|0;
    $$sum2324 = $8 | 4;
    $138 = (($mem) + ($$sum2324)|0);
    $139 = HEAP32[$138>>2]|0;
    $140 = $134 << 1;
    $141 = ((832 + ($140<<2)|0) + 40|0);
    $142 = ($137|0)==($141|0);
    if (!($142)) {
     $143 = HEAP32[((832 + 16|0))>>2]|0;
     $144 = ($137>>>0)<($143>>>0);
     if ($144) {
      _abort();
      // unreachable;
     }
     $145 = (($137) + 12|0);
     $146 = HEAP32[$145>>2]|0;
     $147 = ($146|0)==($9|0);
     if (!($147)) {
      _abort();
      // unreachable;
     }
    }
    $148 = ($139|0)==($137|0);
    if ($148) {
     $149 = 1 << $134;
     $150 = $149 ^ -1;
     $151 = HEAP32[832>>2]|0;
     $152 = $151 & $150;
     HEAP32[832>>2] = $152;
     break;
    }
    $153 = ($139|0)==($141|0);
    if ($153) {
     $$pre65 = (($139) + 8|0);
     $$pre$phi66Z2D = $$pre65;
    } else {
     $154 = HEAP32[((832 + 16|0))>>2]|0;
     $155 = ($139>>>0)<($154>>>0);
     if ($155) {
      _abort();
      // unreachable;
     }
     $156 = (($139) + 8|0);
     $157 = HEAP32[$156>>2]|0;
     $158 = ($157|0)==($9|0);
     if ($158) {
      $$pre$phi66Z2D = $156;
     } else {
      _abort();
      // unreachable;
     }
    }
    $159 = (($137) + 12|0);
    HEAP32[$159>>2] = $139;
    HEAP32[$$pre$phi66Z2D>>2] = $137;
   } else {
    $$sum5 = (($8) + 16)|0;
    $160 = (($mem) + ($$sum5)|0);
    $161 = HEAP32[$160>>2]|0;
    $$sum67 = $8 | 4;
    $162 = (($mem) + ($$sum67)|0);
    $163 = HEAP32[$162>>2]|0;
    $164 = ($163|0)==($9|0);
    do {
     if ($164) {
      $$sum9 = (($8) + 12)|0;
      $175 = (($mem) + ($$sum9)|0);
      $176 = HEAP32[$175>>2]|0;
      $177 = ($176|0)==(0|0);
      if ($177) {
       $$sum8 = (($8) + 8)|0;
       $178 = (($mem) + ($$sum8)|0);
       $179 = HEAP32[$178>>2]|0;
       $180 = ($179|0)==(0|0);
       if ($180) {
        $R7$1 = 0;
        break;
       } else {
        $R7$0 = $179;$RP9$0 = $178;
       }
      } else {
       $R7$0 = $176;$RP9$0 = $175;
      }
      while(1) {
       $181 = (($R7$0) + 20|0);
       $182 = HEAP32[$181>>2]|0;
       $183 = ($182|0)==(0|0);
       if (!($183)) {
        $R7$0 = $182;$RP9$0 = $181;
        continue;
       }
       $184 = (($R7$0) + 16|0);
       $185 = HEAP32[$184>>2]|0;
       $186 = ($185|0)==(0|0);
       if ($186) {
        break;
       } else {
        $R7$0 = $185;$RP9$0 = $184;
       }
      }
      $187 = HEAP32[((832 + 16|0))>>2]|0;
      $188 = ($RP9$0>>>0)<($187>>>0);
      if ($188) {
       _abort();
       // unreachable;
      } else {
       HEAP32[$RP9$0>>2] = 0;
       $R7$1 = $R7$0;
       break;
      }
     } else {
      $165 = (($mem) + ($8)|0);
      $166 = HEAP32[$165>>2]|0;
      $167 = HEAP32[((832 + 16|0))>>2]|0;
      $168 = ($166>>>0)<($167>>>0);
      if ($168) {
       _abort();
       // unreachable;
      }
      $169 = (($166) + 12|0);
      $170 = HEAP32[$169>>2]|0;
      $171 = ($170|0)==($9|0);
      if (!($171)) {
       _abort();
       // unreachable;
      }
      $172 = (($163) + 8|0);
      $173 = HEAP32[$172>>2]|0;
      $174 = ($173|0)==($9|0);
      if ($174) {
       HEAP32[$169>>2] = $163;
       HEAP32[$172>>2] = $166;
       $R7$1 = $163;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $189 = ($161|0)==(0|0);
    if (!($189)) {
     $$sum18 = (($8) + 20)|0;
     $190 = (($mem) + ($$sum18)|0);
     $191 = HEAP32[$190>>2]|0;
     $192 = ((832 + ($191<<2)|0) + 304|0);
     $193 = HEAP32[$192>>2]|0;
     $194 = ($9|0)==($193|0);
     if ($194) {
      HEAP32[$192>>2] = $R7$1;
      $cond54 = ($R7$1|0)==(0|0);
      if ($cond54) {
       $195 = 1 << $191;
       $196 = $195 ^ -1;
       $197 = HEAP32[((832 + 4|0))>>2]|0;
       $198 = $197 & $196;
       HEAP32[((832 + 4|0))>>2] = $198;
       break;
      }
     } else {
      $199 = HEAP32[((832 + 16|0))>>2]|0;
      $200 = ($161>>>0)<($199>>>0);
      if ($200) {
       _abort();
       // unreachable;
      }
      $201 = (($161) + 16|0);
      $202 = HEAP32[$201>>2]|0;
      $203 = ($202|0)==($9|0);
      if ($203) {
       HEAP32[$201>>2] = $R7$1;
      } else {
       $204 = (($161) + 20|0);
       HEAP32[$204>>2] = $R7$1;
      }
      $205 = ($R7$1|0)==(0|0);
      if ($205) {
       break;
      }
     }
     $206 = HEAP32[((832 + 16|0))>>2]|0;
     $207 = ($R7$1>>>0)<($206>>>0);
     if ($207) {
      _abort();
      // unreachable;
     }
     $208 = (($R7$1) + 24|0);
     HEAP32[$208>>2] = $161;
     $$sum19 = (($8) + 8)|0;
     $209 = (($mem) + ($$sum19)|0);
     $210 = HEAP32[$209>>2]|0;
     $211 = ($210|0)==(0|0);
     do {
      if (!($211)) {
       $212 = ($210>>>0)<($206>>>0);
       if ($212) {
        _abort();
        // unreachable;
       } else {
        $213 = (($R7$1) + 16|0);
        HEAP32[$213>>2] = $210;
        $214 = (($210) + 24|0);
        HEAP32[$214>>2] = $R7$1;
        break;
       }
      }
     } while(0);
     $$sum20 = (($8) + 12)|0;
     $215 = (($mem) + ($$sum20)|0);
     $216 = HEAP32[$215>>2]|0;
     $217 = ($216|0)==(0|0);
     if (!($217)) {
      $218 = HEAP32[((832 + 16|0))>>2]|0;
      $219 = ($216>>>0)<($218>>>0);
      if ($219) {
       _abort();
       // unreachable;
      } else {
       $220 = (($R7$1) + 20|0);
       HEAP32[$220>>2] = $216;
       $221 = (($216) + 24|0);
       HEAP32[$221>>2] = $R7$1;
       break;
      }
     }
    }
   }
  } while(0);
  $222 = $133 | 1;
  $223 = (($p$0) + 4|0);
  HEAP32[$223>>2] = $222;
  $224 = (($p$0) + ($133)|0);
  HEAP32[$224>>2] = $133;
  $225 = HEAP32[((832 + 20|0))>>2]|0;
  $226 = ($p$0|0)==($225|0);
  if ($226) {
   HEAP32[((832 + 8|0))>>2] = $133;
   STACKTOP = sp;return;
  } else {
   $psize$1 = $133;
  }
 } else {
  $227 = $112 & -2;
  HEAP32[$111>>2] = $227;
  $228 = $psize$0 | 1;
  $229 = (($p$0) + 4|0);
  HEAP32[$229>>2] = $228;
  $230 = (($p$0) + ($psize$0)|0);
  HEAP32[$230>>2] = $psize$0;
  $psize$1 = $psize$0;
 }
 $231 = $psize$1 >>> 3;
 $232 = ($psize$1>>>0)<(256);
 if ($232) {
  $233 = $231 << 1;
  $234 = ((832 + ($233<<2)|0) + 40|0);
  $235 = HEAP32[832>>2]|0;
  $236 = 1 << $231;
  $237 = $235 & $236;
  $238 = ($237|0)==(0);
  if ($238) {
   $239 = $235 | $236;
   HEAP32[832>>2] = $239;
   $$sum16$pre = (($233) + 2)|0;
   $$pre = ((832 + ($$sum16$pre<<2)|0) + 40|0);
   $$pre$phiZ2D = $$pre;$F16$0 = $234;
  } else {
   $$sum17 = (($233) + 2)|0;
   $240 = ((832 + ($$sum17<<2)|0) + 40|0);
   $241 = HEAP32[$240>>2]|0;
   $242 = HEAP32[((832 + 16|0))>>2]|0;
   $243 = ($241>>>0)<($242>>>0);
   if ($243) {
    _abort();
    // unreachable;
   } else {
    $$pre$phiZ2D = $240;$F16$0 = $241;
   }
  }
  HEAP32[$$pre$phiZ2D>>2] = $p$0;
  $244 = (($F16$0) + 12|0);
  HEAP32[$244>>2] = $p$0;
  $245 = (($p$0) + 8|0);
  HEAP32[$245>>2] = $F16$0;
  $246 = (($p$0) + 12|0);
  HEAP32[$246>>2] = $234;
  STACKTOP = sp;return;
 }
 $247 = $psize$1 >>> 8;
 $248 = ($247|0)==(0);
 if ($248) {
  $I18$0 = 0;
 } else {
  $249 = ($psize$1>>>0)>(16777215);
  if ($249) {
   $I18$0 = 31;
  } else {
   $250 = (($247) + 1048320)|0;
   $251 = $250 >>> 16;
   $252 = $251 & 8;
   $253 = $247 << $252;
   $254 = (($253) + 520192)|0;
   $255 = $254 >>> 16;
   $256 = $255 & 4;
   $257 = $256 | $252;
   $258 = $253 << $256;
   $259 = (($258) + 245760)|0;
   $260 = $259 >>> 16;
   $261 = $260 & 2;
   $262 = $257 | $261;
   $263 = (14 - ($262))|0;
   $264 = $258 << $261;
   $265 = $264 >>> 15;
   $266 = (($263) + ($265))|0;
   $267 = $266 << 1;
   $268 = (($266) + 7)|0;
   $269 = $psize$1 >>> $268;
   $270 = $269 & 1;
   $271 = $270 | $267;
   $I18$0 = $271;
  }
 }
 $272 = ((832 + ($I18$0<<2)|0) + 304|0);
 $273 = (($p$0) + 28|0);
 $I18$0$c = $I18$0;
 HEAP32[$273>>2] = $I18$0$c;
 $274 = (($p$0) + 20|0);
 HEAP32[$274>>2] = 0;
 $275 = (($p$0) + 16|0);
 HEAP32[$275>>2] = 0;
 $276 = HEAP32[((832 + 4|0))>>2]|0;
 $277 = 1 << $I18$0;
 $278 = $276 & $277;
 $279 = ($278|0)==(0);
 L199: do {
  if ($279) {
   $280 = $276 | $277;
   HEAP32[((832 + 4|0))>>2] = $280;
   HEAP32[$272>>2] = $p$0;
   $281 = (($p$0) + 24|0);
   HEAP32[$281>>2] = $272;
   $282 = (($p$0) + 12|0);
   HEAP32[$282>>2] = $p$0;
   $283 = (($p$0) + 8|0);
   HEAP32[$283>>2] = $p$0;
  } else {
   $284 = HEAP32[$272>>2]|0;
   $285 = ($I18$0|0)==(31);
   if ($285) {
    $293 = 0;
   } else {
    $286 = $I18$0 >>> 1;
    $287 = (25 - ($286))|0;
    $293 = $287;
   }
   $288 = (($284) + 4|0);
   $289 = HEAP32[$288>>2]|0;
   $290 = $289 & -8;
   $291 = ($290|0)==($psize$1|0);
   L205: do {
    if ($291) {
     $T$0$lcssa = $284;
    } else {
     $292 = $psize$1 << $293;
     $K19$058 = $292;$T$057 = $284;
     while(1) {
      $300 = $K19$058 >>> 31;
      $301 = ((($T$057) + ($300<<2)|0) + 16|0);
      $296 = HEAP32[$301>>2]|0;
      $302 = ($296|0)==(0|0);
      if ($302) {
       break;
      }
      $294 = $K19$058 << 1;
      $295 = (($296) + 4|0);
      $297 = HEAP32[$295>>2]|0;
      $298 = $297 & -8;
      $299 = ($298|0)==($psize$1|0);
      if ($299) {
       $T$0$lcssa = $296;
       break L205;
      } else {
       $K19$058 = $294;$T$057 = $296;
      }
     }
     $303 = HEAP32[((832 + 16|0))>>2]|0;
     $304 = ($301>>>0)<($303>>>0);
     if ($304) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$301>>2] = $p$0;
      $305 = (($p$0) + 24|0);
      HEAP32[$305>>2] = $T$057;
      $306 = (($p$0) + 12|0);
      HEAP32[$306>>2] = $p$0;
      $307 = (($p$0) + 8|0);
      HEAP32[$307>>2] = $p$0;
      break L199;
     }
    }
   } while(0);
   $308 = (($T$0$lcssa) + 8|0);
   $309 = HEAP32[$308>>2]|0;
   $310 = HEAP32[((832 + 16|0))>>2]|0;
   $311 = ($T$0$lcssa>>>0)>=($310>>>0);
   $312 = ($309>>>0)>=($310>>>0);
   $or$cond = $311 & $312;
   if ($or$cond) {
    $313 = (($309) + 12|0);
    HEAP32[$313>>2] = $p$0;
    HEAP32[$308>>2] = $p$0;
    $314 = (($p$0) + 8|0);
    HEAP32[$314>>2] = $309;
    $315 = (($p$0) + 12|0);
    HEAP32[$315>>2] = $T$0$lcssa;
    $316 = (($p$0) + 24|0);
    HEAP32[$316>>2] = 0;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $317 = HEAP32[((832 + 32|0))>>2]|0;
 $318 = (($317) + -1)|0;
 HEAP32[((832 + 32|0))>>2] = $318;
 $319 = ($318|0)==(0);
 if ($319) {
  $sp$0$in$i = ((832 + 456|0));
 } else {
  STACKTOP = sp;return;
 }
 while(1) {
  $sp$0$i = HEAP32[$sp$0$in$i>>2]|0;
  $320 = ($sp$0$i|0)==(0|0);
  $321 = (($sp$0$i) + 8|0);
  if ($320) {
   break;
  } else {
   $sp$0$in$i = $321;
  }
 }
 HEAP32[((832 + 32|0))>>2] = -1;
 STACKTOP = sp;return;
}
function _realloc($oldmem,$bytes) {
 $oldmem = $oldmem|0;
 $bytes = $bytes|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0;
 var $7 = 0, $8 = 0, $9 = 0, $mem$0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($oldmem|0)==(0|0);
 do {
  if ($0) {
   $1 = (_malloc($bytes)|0);
   $mem$0 = $1;
  } else {
   $2 = ($bytes>>>0)>(4294967231);
   if ($2) {
    $3 = (___errno_location()|0);
    HEAP32[$3>>2] = 12;
    $mem$0 = 0;
    break;
   }
   $4 = ($bytes>>>0)<(11);
   if ($4) {
    $8 = 16;
   } else {
    $5 = (($bytes) + 11)|0;
    $6 = $5 & -8;
    $8 = $6;
   }
   $7 = (($oldmem) + -8|0);
   $9 = (_try_realloc_chunk($7,$8)|0);
   $10 = ($9|0)==(0|0);
   if (!($10)) {
    $11 = (($9) + 8|0);
    $mem$0 = $11;
    break;
   }
   $12 = (_malloc($bytes)|0);
   $13 = ($12|0)==(0|0);
   if ($13) {
    $mem$0 = 0;
   } else {
    $14 = (($oldmem) + -4|0);
    $15 = HEAP32[$14>>2]|0;
    $16 = $15 & -8;
    $17 = $15 & 3;
    $18 = ($17|0)==(0);
    $19 = $18 ? 8 : 4;
    $20 = (($16) - ($19))|0;
    $21 = ($20>>>0)<($bytes>>>0);
    $22 = $21 ? $20 : $bytes;
    _memcpy(($12|0),($oldmem|0),($22|0))|0;
    _free($oldmem);
    $mem$0 = $12;
   }
  }
 } while(0);
 STACKTOP = sp;return ($mem$0|0);
}
function _fmax($x,$y) {
 $x = +$x;
 $y = +$y;
 var $$0 = 0.0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0.0, $23 = 0, $24 = 0.0, $3 = 0;
 var $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 $2 = $1 & 2147483647;
 $3 = ($2>>>0)>(2146435072);
 $4 = ($0>>>0)>(0);
 $5 = ($2|0)==(2146435072);
 $6 = $5 & $4;
 $7 = $3 | $6;
 if ($7) {
  $$0 = $y;
  STACKTOP = sp;return (+$$0);
 }
 HEAPF64[tempDoublePtr>>3] = $y;$8 = HEAP32[tempDoublePtr>>2]|0;
 $9 = HEAP32[tempDoublePtr+4>>2]|0;
 $10 = $9 & 2147483647;
 $11 = ($10>>>0)>(2146435072);
 $12 = ($8>>>0)>(0);
 $13 = ($10|0)==(2146435072);
 $14 = $13 & $12;
 $15 = $11 | $14;
 if ($15) {
  $$0 = $x;
  STACKTOP = sp;return (+$$0);
 }
 $16 = (_bitshift64Lshr(($0|0),($1|0),63)|0);
 $17 = tempRet0;
 $18 = (_bitshift64Lshr(($8|0),($9|0),63)|0);
 $19 = tempRet0;
 $20 = ($16|0)==($18|0);
 if ($20) {
  $23 = $x < $y;
  $24 = $23 ? $y : $x;
  $$0 = $24;
  STACKTOP = sp;return (+$$0);
 } else {
  $21 = ($1|0)<(0);
  $22 = $21 ? $y : $x;
  $$0 = $22;
  STACKTOP = sp;return (+$$0);
 }
 return +(0.0);
}
function _fmaxf($x,$y) {
 $x = +$x;
 $y = +$y;
 var $$0 = 0.0, $$unshifted = 0, $0 = 0, $1 = 0, $10 = 0.0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0.0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (HEAPF32[tempDoublePtr>>2]=$x,HEAP32[tempDoublePtr>>2]|0);
 $1 = $0 & 2147483647;
 $2 = ($1>>>0)>(2139095040);
 do {
  if ($2) {
   $$0 = $y;
  } else {
   $3 = (HEAPF32[tempDoublePtr>>2]=$y,HEAP32[tempDoublePtr>>2]|0);
   $4 = $3 & 2147483647;
   $5 = ($4>>>0)>(2139095040);
   if ($5) {
    $$0 = $x;
   } else {
    $$unshifted = $3 ^ $0;
    $6 = ($$unshifted|0)<(0);
    if ($6) {
     $7 = ($0|0)<(0);
     $8 = $7 ? $y : $x;
     $$0 = $8;
     break;
    } else {
     $9 = $x < $y;
     $10 = $9 ? $y : $x;
     $$0 = $10;
     break;
    }
   }
  }
 } while(0);
 STACKTOP = sp;return (+$$0);
}
function _fminf($x,$y) {
 $x = +$x;
 $y = +$y;
 var $$0 = 0.0, $$unshifted = 0, $0 = 0, $1 = 0, $10 = 0.0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0.0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (HEAPF32[tempDoublePtr>>2]=$x,HEAP32[tempDoublePtr>>2]|0);
 $1 = $0 & 2147483647;
 $2 = ($1>>>0)>(2139095040);
 do {
  if ($2) {
   $$0 = $y;
  } else {
   $3 = (HEAPF32[tempDoublePtr>>2]=$y,HEAP32[tempDoublePtr>>2]|0);
   $4 = $3 & 2147483647;
   $5 = ($4>>>0)>(2139095040);
   if ($5) {
    $$0 = $x;
   } else {
    $$unshifted = $3 ^ $0;
    $6 = ($$unshifted|0)<(0);
    if ($6) {
     $7 = ($0|0)<(0);
     $8 = $7 ? $x : $y;
     $$0 = $8;
     break;
    } else {
     $9 = $x < $y;
     $10 = $9 ? $x : $y;
     $$0 = $10;
     break;
    }
   }
  }
 } while(0);
 STACKTOP = sp;return (+$$0);
}
function _strcmp($l,$r) {
 $l = $l|0;
 $r = $r|0;
 var $$014 = 0, $$05 = 0, $$lcssa = 0, $$lcssa2 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, $or$cond3 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[$l>>0]|0;
 $1 = HEAP8[$r>>0]|0;
 $2 = ($0<<24>>24)!=($1<<24>>24);
 $3 = ($0<<24>>24)==(0);
 $or$cond3 = $2 | $3;
 if ($or$cond3) {
  $$lcssa = $0;$$lcssa2 = $1;
 } else {
  $$014 = $l;$$05 = $r;
  while(1) {
   $4 = (($$014) + 1|0);
   $5 = (($$05) + 1|0);
   $6 = HEAP8[$4>>0]|0;
   $7 = HEAP8[$5>>0]|0;
   $8 = ($6<<24>>24)!=($7<<24>>24);
   $9 = ($6<<24>>24)==(0);
   $or$cond = $8 | $9;
   if ($or$cond) {
    $$lcssa = $6;$$lcssa2 = $7;
    break;
   } else {
    $$014 = $4;$$05 = $5;
   }
  }
 }
 $10 = $$lcssa&255;
 $11 = $$lcssa2&255;
 $12 = (($10) - ($11))|0;
 STACKTOP = sp;return ($12|0);
}
function _try_realloc_chunk($p,$nb) {
 $p = $p|0;
 $nb = $nb|0;
 var $$pre = 0, $$pre$phiZ2D = 0, $$sum = 0, $$sum11 = 0, $$sum12 = 0, $$sum13 = 0, $$sum14 = 0, $$sum15 = 0, $$sum16 = 0, $$sum17 = 0, $$sum19 = 0, $$sum2 = 0, $$sum20 = 0, $$sum22 = 0, $$sum23 = 0, $$sum2728 = 0, $$sum3 = 0, $$sum4 = 0, $$sum5 = 0, $$sum78 = 0;
 var $$sum910 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0;
 var $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0;
 var $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0;
 var $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0;
 var $17 = 0, $170 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0;
 var $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0;
 var $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0;
 var $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0;
 var $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $R$0 = 0, $R$1 = 0, $RP$0 = 0, $cond = 0, $newp$0 = 0, $notlhs = 0, $notrhs = 0, $or$cond$not = 0;
 var $or$cond30 = 0, $storemerge = 0, $storemerge21 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($p) + 4|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = $1 & -8;
 $3 = (($p) + ($2)|0);
 $4 = HEAP32[((832 + 16|0))>>2]|0;
 $5 = $1 & 3;
 $notlhs = ($p>>>0)>=($4>>>0);
 $notrhs = ($5|0)!=(1);
 $or$cond$not = $notrhs & $notlhs;
 $6 = ($p>>>0)<($3>>>0);
 $or$cond30 = $or$cond$not & $6;
 if (!($or$cond30)) {
  _abort();
  // unreachable;
 }
 $$sum2728 = $2 | 4;
 $7 = (($p) + ($$sum2728)|0);
 $8 = HEAP32[$7>>2]|0;
 $9 = $8 & 1;
 $10 = ($9|0)==(0);
 if ($10) {
  _abort();
  // unreachable;
 }
 $11 = ($5|0)==(0);
 if ($11) {
  $12 = ($nb>>>0)<(256);
  if ($12) {
   $newp$0 = 0;
   STACKTOP = sp;return ($newp$0|0);
  }
  $13 = (($nb) + 4)|0;
  $14 = ($2>>>0)<($13>>>0);
  if (!($14)) {
   $15 = (($2) - ($nb))|0;
   $16 = HEAP32[((1304 + 8|0))>>2]|0;
   $17 = $16 << 1;
   $18 = ($15>>>0)>($17>>>0);
   if (!($18)) {
    $newp$0 = $p;
    STACKTOP = sp;return ($newp$0|0);
   }
  }
  $newp$0 = 0;
  STACKTOP = sp;return ($newp$0|0);
 }
 $19 = ($2>>>0)<($nb>>>0);
 if (!($19)) {
  $20 = (($2) - ($nb))|0;
  $21 = ($20>>>0)>(15);
  if (!($21)) {
   $newp$0 = $p;
   STACKTOP = sp;return ($newp$0|0);
  }
  $22 = (($p) + ($nb)|0);
  $23 = $1 & 1;
  $24 = $23 | $nb;
  $25 = $24 | 2;
  HEAP32[$0>>2] = $25;
  $$sum23 = (($nb) + 4)|0;
  $26 = (($p) + ($$sum23)|0);
  $27 = $20 | 3;
  HEAP32[$26>>2] = $27;
  $28 = HEAP32[$7>>2]|0;
  $29 = $28 | 1;
  HEAP32[$7>>2] = $29;
  _dispose_chunk($22,$20);
  $newp$0 = $p;
  STACKTOP = sp;return ($newp$0|0);
 }
 $30 = HEAP32[((832 + 24|0))>>2]|0;
 $31 = ($3|0)==($30|0);
 if ($31) {
  $32 = HEAP32[((832 + 12|0))>>2]|0;
  $33 = (($32) + ($2))|0;
  $34 = ($33>>>0)>($nb>>>0);
  if (!($34)) {
   $newp$0 = 0;
   STACKTOP = sp;return ($newp$0|0);
  }
  $35 = (($33) - ($nb))|0;
  $36 = (($p) + ($nb)|0);
  $37 = $1 & 1;
  $38 = $37 | $nb;
  $39 = $38 | 2;
  HEAP32[$0>>2] = $39;
  $$sum22 = (($nb) + 4)|0;
  $40 = (($p) + ($$sum22)|0);
  $41 = $35 | 1;
  HEAP32[$40>>2] = $41;
  HEAP32[((832 + 24|0))>>2] = $36;
  HEAP32[((832 + 12|0))>>2] = $35;
  $newp$0 = $p;
  STACKTOP = sp;return ($newp$0|0);
 }
 $42 = HEAP32[((832 + 20|0))>>2]|0;
 $43 = ($3|0)==($42|0);
 if ($43) {
  $44 = HEAP32[((832 + 8|0))>>2]|0;
  $45 = (($44) + ($2))|0;
  $46 = ($45>>>0)<($nb>>>0);
  if ($46) {
   $newp$0 = 0;
   STACKTOP = sp;return ($newp$0|0);
  }
  $47 = (($45) - ($nb))|0;
  $48 = ($47>>>0)>(15);
  if ($48) {
   $49 = (($p) + ($nb)|0);
   $50 = (($p) + ($45)|0);
   $51 = $1 & 1;
   $52 = $51 | $nb;
   $53 = $52 | 2;
   HEAP32[$0>>2] = $53;
   $$sum19 = (($nb) + 4)|0;
   $54 = (($p) + ($$sum19)|0);
   $55 = $47 | 1;
   HEAP32[$54>>2] = $55;
   HEAP32[$50>>2] = $47;
   $$sum20 = (($45) + 4)|0;
   $56 = (($p) + ($$sum20)|0);
   $57 = HEAP32[$56>>2]|0;
   $58 = $57 & -2;
   HEAP32[$56>>2] = $58;
   $storemerge = $49;$storemerge21 = $47;
  } else {
   $59 = $1 & 1;
   $60 = $59 | $45;
   $61 = $60 | 2;
   HEAP32[$0>>2] = $61;
   $$sum17 = (($45) + 4)|0;
   $62 = (($p) + ($$sum17)|0);
   $63 = HEAP32[$62>>2]|0;
   $64 = $63 | 1;
   HEAP32[$62>>2] = $64;
   $storemerge = 0;$storemerge21 = 0;
  }
  HEAP32[((832 + 8|0))>>2] = $storemerge21;
  HEAP32[((832 + 20|0))>>2] = $storemerge;
  $newp$0 = $p;
  STACKTOP = sp;return ($newp$0|0);
 }
 $65 = $8 & 2;
 $66 = ($65|0)==(0);
 if (!($66)) {
  $newp$0 = 0;
  STACKTOP = sp;return ($newp$0|0);
 }
 $67 = $8 & -8;
 $68 = (($67) + ($2))|0;
 $69 = ($68>>>0)<($nb>>>0);
 if ($69) {
  $newp$0 = 0;
  STACKTOP = sp;return ($newp$0|0);
 }
 $70 = (($68) - ($nb))|0;
 $71 = $8 >>> 3;
 $72 = ($8>>>0)<(256);
 do {
  if ($72) {
   $$sum15 = (($2) + 8)|0;
   $73 = (($p) + ($$sum15)|0);
   $74 = HEAP32[$73>>2]|0;
   $$sum16 = (($2) + 12)|0;
   $75 = (($p) + ($$sum16)|0);
   $76 = HEAP32[$75>>2]|0;
   $77 = $71 << 1;
   $78 = ((832 + ($77<<2)|0) + 40|0);
   $79 = ($74|0)==($78|0);
   if (!($79)) {
    $80 = ($74>>>0)<($4>>>0);
    if ($80) {
     _abort();
     // unreachable;
    }
    $81 = (($74) + 12|0);
    $82 = HEAP32[$81>>2]|0;
    $83 = ($82|0)==($3|0);
    if (!($83)) {
     _abort();
     // unreachable;
    }
   }
   $84 = ($76|0)==($74|0);
   if ($84) {
    $85 = 1 << $71;
    $86 = $85 ^ -1;
    $87 = HEAP32[832>>2]|0;
    $88 = $87 & $86;
    HEAP32[832>>2] = $88;
    break;
   }
   $89 = ($76|0)==($78|0);
   if ($89) {
    $$pre = (($76) + 8|0);
    $$pre$phiZ2D = $$pre;
   } else {
    $90 = ($76>>>0)<($4>>>0);
    if ($90) {
     _abort();
     // unreachable;
    }
    $91 = (($76) + 8|0);
    $92 = HEAP32[$91>>2]|0;
    $93 = ($92|0)==($3|0);
    if ($93) {
     $$pre$phiZ2D = $91;
    } else {
     _abort();
     // unreachable;
    }
   }
   $94 = (($74) + 12|0);
   HEAP32[$94>>2] = $76;
   HEAP32[$$pre$phiZ2D>>2] = $74;
  } else {
   $$sum = (($2) + 24)|0;
   $95 = (($p) + ($$sum)|0);
   $96 = HEAP32[$95>>2]|0;
   $$sum2 = (($2) + 12)|0;
   $97 = (($p) + ($$sum2)|0);
   $98 = HEAP32[$97>>2]|0;
   $99 = ($98|0)==($3|0);
   do {
    if ($99) {
     $$sum4 = (($2) + 20)|0;
     $109 = (($p) + ($$sum4)|0);
     $110 = HEAP32[$109>>2]|0;
     $111 = ($110|0)==(0|0);
     if ($111) {
      $$sum3 = (($2) + 16)|0;
      $112 = (($p) + ($$sum3)|0);
      $113 = HEAP32[$112>>2]|0;
      $114 = ($113|0)==(0|0);
      if ($114) {
       $R$1 = 0;
       break;
      } else {
       $R$0 = $113;$RP$0 = $112;
      }
     } else {
      $R$0 = $110;$RP$0 = $109;
     }
     while(1) {
      $115 = (($R$0) + 20|0);
      $116 = HEAP32[$115>>2]|0;
      $117 = ($116|0)==(0|0);
      if (!($117)) {
       $R$0 = $116;$RP$0 = $115;
       continue;
      }
      $118 = (($R$0) + 16|0);
      $119 = HEAP32[$118>>2]|0;
      $120 = ($119|0)==(0|0);
      if ($120) {
       break;
      } else {
       $R$0 = $119;$RP$0 = $118;
      }
     }
     $121 = ($RP$0>>>0)<($4>>>0);
     if ($121) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$RP$0>>2] = 0;
      $R$1 = $R$0;
      break;
     }
    } else {
     $$sum14 = (($2) + 8)|0;
     $100 = (($p) + ($$sum14)|0);
     $101 = HEAP32[$100>>2]|0;
     $102 = ($101>>>0)<($4>>>0);
     if ($102) {
      _abort();
      // unreachable;
     }
     $103 = (($101) + 12|0);
     $104 = HEAP32[$103>>2]|0;
     $105 = ($104|0)==($3|0);
     if (!($105)) {
      _abort();
      // unreachable;
     }
     $106 = (($98) + 8|0);
     $107 = HEAP32[$106>>2]|0;
     $108 = ($107|0)==($3|0);
     if ($108) {
      HEAP32[$103>>2] = $98;
      HEAP32[$106>>2] = $101;
      $R$1 = $98;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   } while(0);
   $122 = ($96|0)==(0|0);
   if (!($122)) {
    $$sum11 = (($2) + 28)|0;
    $123 = (($p) + ($$sum11)|0);
    $124 = HEAP32[$123>>2]|0;
    $125 = ((832 + ($124<<2)|0) + 304|0);
    $126 = HEAP32[$125>>2]|0;
    $127 = ($3|0)==($126|0);
    if ($127) {
     HEAP32[$125>>2] = $R$1;
     $cond = ($R$1|0)==(0|0);
     if ($cond) {
      $128 = 1 << $124;
      $129 = $128 ^ -1;
      $130 = HEAP32[((832 + 4|0))>>2]|0;
      $131 = $130 & $129;
      HEAP32[((832 + 4|0))>>2] = $131;
      break;
     }
    } else {
     $132 = HEAP32[((832 + 16|0))>>2]|0;
     $133 = ($96>>>0)<($132>>>0);
     if ($133) {
      _abort();
      // unreachable;
     }
     $134 = (($96) + 16|0);
     $135 = HEAP32[$134>>2]|0;
     $136 = ($135|0)==($3|0);
     if ($136) {
      HEAP32[$134>>2] = $R$1;
     } else {
      $137 = (($96) + 20|0);
      HEAP32[$137>>2] = $R$1;
     }
     $138 = ($R$1|0)==(0|0);
     if ($138) {
      break;
     }
    }
    $139 = HEAP32[((832 + 16|0))>>2]|0;
    $140 = ($R$1>>>0)<($139>>>0);
    if ($140) {
     _abort();
     // unreachable;
    }
    $141 = (($R$1) + 24|0);
    HEAP32[$141>>2] = $96;
    $$sum12 = (($2) + 16)|0;
    $142 = (($p) + ($$sum12)|0);
    $143 = HEAP32[$142>>2]|0;
    $144 = ($143|0)==(0|0);
    do {
     if (!($144)) {
      $145 = ($143>>>0)<($139>>>0);
      if ($145) {
       _abort();
       // unreachable;
      } else {
       $146 = (($R$1) + 16|0);
       HEAP32[$146>>2] = $143;
       $147 = (($143) + 24|0);
       HEAP32[$147>>2] = $R$1;
       break;
      }
     }
    } while(0);
    $$sum13 = (($2) + 20)|0;
    $148 = (($p) + ($$sum13)|0);
    $149 = HEAP32[$148>>2]|0;
    $150 = ($149|0)==(0|0);
    if (!($150)) {
     $151 = HEAP32[((832 + 16|0))>>2]|0;
     $152 = ($149>>>0)<($151>>>0);
     if ($152) {
      _abort();
      // unreachable;
     } else {
      $153 = (($R$1) + 20|0);
      HEAP32[$153>>2] = $149;
      $154 = (($149) + 24|0);
      HEAP32[$154>>2] = $R$1;
      break;
     }
    }
   }
  }
 } while(0);
 $155 = ($70>>>0)<(16);
 if ($155) {
  $156 = $1 & 1;
  $157 = $68 | $156;
  $158 = $157 | 2;
  HEAP32[$0>>2] = $158;
  $$sum910 = $68 | 4;
  $159 = (($p) + ($$sum910)|0);
  $160 = HEAP32[$159>>2]|0;
  $161 = $160 | 1;
  HEAP32[$159>>2] = $161;
  $newp$0 = $p;
  STACKTOP = sp;return ($newp$0|0);
 } else {
  $162 = (($p) + ($nb)|0);
  $163 = $1 & 1;
  $164 = $163 | $nb;
  $165 = $164 | 2;
  HEAP32[$0>>2] = $165;
  $$sum5 = (($nb) + 4)|0;
  $166 = (($p) + ($$sum5)|0);
  $167 = $70 | 3;
  HEAP32[$166>>2] = $167;
  $$sum78 = $68 | 4;
  $168 = (($p) + ($$sum78)|0);
  $169 = HEAP32[$168>>2]|0;
  $170 = $169 | 1;
  HEAP32[$168>>2] = $170;
  _dispose_chunk($162,$70);
  $newp$0 = $p;
  STACKTOP = sp;return ($newp$0|0);
 }
 return (0)|0;
}
function _dispose_chunk($p,$psize) {
 $p = $p|0;
 $psize = $psize|0;
 var $$0 = 0, $$02 = 0, $$1 = 0, $$pre = 0, $$pre$phi57Z2D = 0, $$pre$phi59Z2D = 0, $$pre$phiZ2D = 0, $$pre56 = 0, $$pre58 = 0, $$sum = 0, $$sum1 = 0, $$sum12$pre = 0, $$sum13 = 0, $$sum14 = 0, $$sum15 = 0, $$sum16 = 0, $$sum17 = 0, $$sum18 = 0, $$sum19 = 0, $$sum2 = 0;
 var $$sum20 = 0, $$sum22 = 0, $$sum23 = 0, $$sum24 = 0, $$sum25 = 0, $$sum26 = 0, $$sum27 = 0, $$sum28 = 0, $$sum29 = 0, $$sum3 = 0, $$sum30 = 0, $$sum31 = 0, $$sum4 = 0, $$sum5 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0;
 var $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0;
 var $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0;
 var $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0;
 var $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0;
 var $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0;
 var $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0;
 var $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0;
 var $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0;
 var $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0;
 var $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0;
 var $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0;
 var $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0;
 var $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0;
 var $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0;
 var $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0;
 var $98 = 0, $99 = 0, $F16$0 = 0, $I19$0 = 0, $I19$0$c = 0, $K20$050 = 0, $R$0 = 0, $R$1 = 0, $R7$0 = 0, $R7$1 = 0, $RP$0 = 0, $RP9$0 = 0, $T$0$lcssa = 0, $T$049 = 0, $cond = 0, $cond46 = 0, $or$cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($p) + ($psize)|0);
 $1 = (($p) + 4|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = $2 & 1;
 $4 = ($3|0)==(0);
 do {
  if ($4) {
   $5 = HEAP32[$p>>2]|0;
   $6 = $2 & 3;
   $7 = ($6|0)==(0);
   if ($7) {
    STACKTOP = sp;return;
   }
   $8 = (0 - ($5))|0;
   $9 = (($p) + ($8)|0);
   $10 = (($5) + ($psize))|0;
   $11 = HEAP32[((832 + 16|0))>>2]|0;
   $12 = ($9>>>0)<($11>>>0);
   if ($12) {
    _abort();
    // unreachable;
   }
   $13 = HEAP32[((832 + 20|0))>>2]|0;
   $14 = ($9|0)==($13|0);
   if ($14) {
    $$sum = (($psize) + 4)|0;
    $99 = (($p) + ($$sum)|0);
    $100 = HEAP32[$99>>2]|0;
    $101 = $100 & 3;
    $102 = ($101|0)==(3);
    if (!($102)) {
     $$0 = $9;$$02 = $10;
     break;
    }
    HEAP32[((832 + 8|0))>>2] = $10;
    $103 = $100 & -2;
    HEAP32[$99>>2] = $103;
    $104 = $10 | 1;
    $$sum20 = (4 - ($5))|0;
    $105 = (($p) + ($$sum20)|0);
    HEAP32[$105>>2] = $104;
    HEAP32[$0>>2] = $10;
    STACKTOP = sp;return;
   }
   $15 = $5 >>> 3;
   $16 = ($5>>>0)<(256);
   if ($16) {
    $$sum30 = (8 - ($5))|0;
    $17 = (($p) + ($$sum30)|0);
    $18 = HEAP32[$17>>2]|0;
    $$sum31 = (12 - ($5))|0;
    $19 = (($p) + ($$sum31)|0);
    $20 = HEAP32[$19>>2]|0;
    $21 = $15 << 1;
    $22 = ((832 + ($21<<2)|0) + 40|0);
    $23 = ($18|0)==($22|0);
    if (!($23)) {
     $24 = ($18>>>0)<($11>>>0);
     if ($24) {
      _abort();
      // unreachable;
     }
     $25 = (($18) + 12|0);
     $26 = HEAP32[$25>>2]|0;
     $27 = ($26|0)==($9|0);
     if (!($27)) {
      _abort();
      // unreachable;
     }
    }
    $28 = ($20|0)==($18|0);
    if ($28) {
     $29 = 1 << $15;
     $30 = $29 ^ -1;
     $31 = HEAP32[832>>2]|0;
     $32 = $31 & $30;
     HEAP32[832>>2] = $32;
     $$0 = $9;$$02 = $10;
     break;
    }
    $33 = ($20|0)==($22|0);
    if ($33) {
     $$pre58 = (($20) + 8|0);
     $$pre$phi59Z2D = $$pre58;
    } else {
     $34 = ($20>>>0)<($11>>>0);
     if ($34) {
      _abort();
      // unreachable;
     }
     $35 = (($20) + 8|0);
     $36 = HEAP32[$35>>2]|0;
     $37 = ($36|0)==($9|0);
     if ($37) {
      $$pre$phi59Z2D = $35;
     } else {
      _abort();
      // unreachable;
     }
    }
    $38 = (($18) + 12|0);
    HEAP32[$38>>2] = $20;
    HEAP32[$$pre$phi59Z2D>>2] = $18;
    $$0 = $9;$$02 = $10;
    break;
   }
   $$sum22 = (24 - ($5))|0;
   $39 = (($p) + ($$sum22)|0);
   $40 = HEAP32[$39>>2]|0;
   $$sum23 = (12 - ($5))|0;
   $41 = (($p) + ($$sum23)|0);
   $42 = HEAP32[$41>>2]|0;
   $43 = ($42|0)==($9|0);
   do {
    if ($43) {
     $$sum24 = (16 - ($5))|0;
     $$sum25 = (($$sum24) + 4)|0;
     $53 = (($p) + ($$sum25)|0);
     $54 = HEAP32[$53>>2]|0;
     $55 = ($54|0)==(0|0);
     if ($55) {
      $56 = (($p) + ($$sum24)|0);
      $57 = HEAP32[$56>>2]|0;
      $58 = ($57|0)==(0|0);
      if ($58) {
       $R$1 = 0;
       break;
      } else {
       $R$0 = $57;$RP$0 = $56;
      }
     } else {
      $R$0 = $54;$RP$0 = $53;
     }
     while(1) {
      $59 = (($R$0) + 20|0);
      $60 = HEAP32[$59>>2]|0;
      $61 = ($60|0)==(0|0);
      if (!($61)) {
       $R$0 = $60;$RP$0 = $59;
       continue;
      }
      $62 = (($R$0) + 16|0);
      $63 = HEAP32[$62>>2]|0;
      $64 = ($63|0)==(0|0);
      if ($64) {
       break;
      } else {
       $R$0 = $63;$RP$0 = $62;
      }
     }
     $65 = ($RP$0>>>0)<($11>>>0);
     if ($65) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$RP$0>>2] = 0;
      $R$1 = $R$0;
      break;
     }
    } else {
     $$sum29 = (8 - ($5))|0;
     $44 = (($p) + ($$sum29)|0);
     $45 = HEAP32[$44>>2]|0;
     $46 = ($45>>>0)<($11>>>0);
     if ($46) {
      _abort();
      // unreachable;
     }
     $47 = (($45) + 12|0);
     $48 = HEAP32[$47>>2]|0;
     $49 = ($48|0)==($9|0);
     if (!($49)) {
      _abort();
      // unreachable;
     }
     $50 = (($42) + 8|0);
     $51 = HEAP32[$50>>2]|0;
     $52 = ($51|0)==($9|0);
     if ($52) {
      HEAP32[$47>>2] = $42;
      HEAP32[$50>>2] = $45;
      $R$1 = $42;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   } while(0);
   $66 = ($40|0)==(0|0);
   if ($66) {
    $$0 = $9;$$02 = $10;
   } else {
    $$sum26 = (28 - ($5))|0;
    $67 = (($p) + ($$sum26)|0);
    $68 = HEAP32[$67>>2]|0;
    $69 = ((832 + ($68<<2)|0) + 304|0);
    $70 = HEAP32[$69>>2]|0;
    $71 = ($9|0)==($70|0);
    if ($71) {
     HEAP32[$69>>2] = $R$1;
     $cond = ($R$1|0)==(0|0);
     if ($cond) {
      $72 = 1 << $68;
      $73 = $72 ^ -1;
      $74 = HEAP32[((832 + 4|0))>>2]|0;
      $75 = $74 & $73;
      HEAP32[((832 + 4|0))>>2] = $75;
      $$0 = $9;$$02 = $10;
      break;
     }
    } else {
     $76 = HEAP32[((832 + 16|0))>>2]|0;
     $77 = ($40>>>0)<($76>>>0);
     if ($77) {
      _abort();
      // unreachable;
     }
     $78 = (($40) + 16|0);
     $79 = HEAP32[$78>>2]|0;
     $80 = ($79|0)==($9|0);
     if ($80) {
      HEAP32[$78>>2] = $R$1;
     } else {
      $81 = (($40) + 20|0);
      HEAP32[$81>>2] = $R$1;
     }
     $82 = ($R$1|0)==(0|0);
     if ($82) {
      $$0 = $9;$$02 = $10;
      break;
     }
    }
    $83 = HEAP32[((832 + 16|0))>>2]|0;
    $84 = ($R$1>>>0)<($83>>>0);
    if ($84) {
     _abort();
     // unreachable;
    }
    $85 = (($R$1) + 24|0);
    HEAP32[$85>>2] = $40;
    $$sum27 = (16 - ($5))|0;
    $86 = (($p) + ($$sum27)|0);
    $87 = HEAP32[$86>>2]|0;
    $88 = ($87|0)==(0|0);
    do {
     if (!($88)) {
      $89 = ($87>>>0)<($83>>>0);
      if ($89) {
       _abort();
       // unreachable;
      } else {
       $90 = (($R$1) + 16|0);
       HEAP32[$90>>2] = $87;
       $91 = (($87) + 24|0);
       HEAP32[$91>>2] = $R$1;
       break;
      }
     }
    } while(0);
    $$sum28 = (($$sum27) + 4)|0;
    $92 = (($p) + ($$sum28)|0);
    $93 = HEAP32[$92>>2]|0;
    $94 = ($93|0)==(0|0);
    if ($94) {
     $$0 = $9;$$02 = $10;
    } else {
     $95 = HEAP32[((832 + 16|0))>>2]|0;
     $96 = ($93>>>0)<($95>>>0);
     if ($96) {
      _abort();
      // unreachable;
     } else {
      $97 = (($R$1) + 20|0);
      HEAP32[$97>>2] = $93;
      $98 = (($93) + 24|0);
      HEAP32[$98>>2] = $R$1;
      $$0 = $9;$$02 = $10;
      break;
     }
    }
   }
  } else {
   $$0 = $p;$$02 = $psize;
  }
 } while(0);
 $106 = HEAP32[((832 + 16|0))>>2]|0;
 $107 = ($0>>>0)<($106>>>0);
 if ($107) {
  _abort();
  // unreachable;
 }
 $$sum1 = (($psize) + 4)|0;
 $108 = (($p) + ($$sum1)|0);
 $109 = HEAP32[$108>>2]|0;
 $110 = $109 & 2;
 $111 = ($110|0)==(0);
 if ($111) {
  $112 = HEAP32[((832 + 24|0))>>2]|0;
  $113 = ($0|0)==($112|0);
  if ($113) {
   $114 = HEAP32[((832 + 12|0))>>2]|0;
   $115 = (($114) + ($$02))|0;
   HEAP32[((832 + 12|0))>>2] = $115;
   HEAP32[((832 + 24|0))>>2] = $$0;
   $116 = $115 | 1;
   $117 = (($$0) + 4|0);
   HEAP32[$117>>2] = $116;
   $118 = HEAP32[((832 + 20|0))>>2]|0;
   $119 = ($$0|0)==($118|0);
   if (!($119)) {
    STACKTOP = sp;return;
   }
   HEAP32[((832 + 20|0))>>2] = 0;
   HEAP32[((832 + 8|0))>>2] = 0;
   STACKTOP = sp;return;
  }
  $120 = HEAP32[((832 + 20|0))>>2]|0;
  $121 = ($0|0)==($120|0);
  if ($121) {
   $122 = HEAP32[((832 + 8|0))>>2]|0;
   $123 = (($122) + ($$02))|0;
   HEAP32[((832 + 8|0))>>2] = $123;
   HEAP32[((832 + 20|0))>>2] = $$0;
   $124 = $123 | 1;
   $125 = (($$0) + 4|0);
   HEAP32[$125>>2] = $124;
   $126 = (($$0) + ($123)|0);
   HEAP32[$126>>2] = $123;
   STACKTOP = sp;return;
  }
  $127 = $109 & -8;
  $128 = (($127) + ($$02))|0;
  $129 = $109 >>> 3;
  $130 = ($109>>>0)<(256);
  do {
   if ($130) {
    $$sum18 = (($psize) + 8)|0;
    $131 = (($p) + ($$sum18)|0);
    $132 = HEAP32[$131>>2]|0;
    $$sum19 = (($psize) + 12)|0;
    $133 = (($p) + ($$sum19)|0);
    $134 = HEAP32[$133>>2]|0;
    $135 = $129 << 1;
    $136 = ((832 + ($135<<2)|0) + 40|0);
    $137 = ($132|0)==($136|0);
    if (!($137)) {
     $138 = ($132>>>0)<($106>>>0);
     if ($138) {
      _abort();
      // unreachable;
     }
     $139 = (($132) + 12|0);
     $140 = HEAP32[$139>>2]|0;
     $141 = ($140|0)==($0|0);
     if (!($141)) {
      _abort();
      // unreachable;
     }
    }
    $142 = ($134|0)==($132|0);
    if ($142) {
     $143 = 1 << $129;
     $144 = $143 ^ -1;
     $145 = HEAP32[832>>2]|0;
     $146 = $145 & $144;
     HEAP32[832>>2] = $146;
     break;
    }
    $147 = ($134|0)==($136|0);
    if ($147) {
     $$pre56 = (($134) + 8|0);
     $$pre$phi57Z2D = $$pre56;
    } else {
     $148 = ($134>>>0)<($106>>>0);
     if ($148) {
      _abort();
      // unreachable;
     }
     $149 = (($134) + 8|0);
     $150 = HEAP32[$149>>2]|0;
     $151 = ($150|0)==($0|0);
     if ($151) {
      $$pre$phi57Z2D = $149;
     } else {
      _abort();
      // unreachable;
     }
    }
    $152 = (($132) + 12|0);
    HEAP32[$152>>2] = $134;
    HEAP32[$$pre$phi57Z2D>>2] = $132;
   } else {
    $$sum2 = (($psize) + 24)|0;
    $153 = (($p) + ($$sum2)|0);
    $154 = HEAP32[$153>>2]|0;
    $$sum3 = (($psize) + 12)|0;
    $155 = (($p) + ($$sum3)|0);
    $156 = HEAP32[$155>>2]|0;
    $157 = ($156|0)==($0|0);
    do {
     if ($157) {
      $$sum5 = (($psize) + 20)|0;
      $167 = (($p) + ($$sum5)|0);
      $168 = HEAP32[$167>>2]|0;
      $169 = ($168|0)==(0|0);
      if ($169) {
       $$sum4 = (($psize) + 16)|0;
       $170 = (($p) + ($$sum4)|0);
       $171 = HEAP32[$170>>2]|0;
       $172 = ($171|0)==(0|0);
       if ($172) {
        $R7$1 = 0;
        break;
       } else {
        $R7$0 = $171;$RP9$0 = $170;
       }
      } else {
       $R7$0 = $168;$RP9$0 = $167;
      }
      while(1) {
       $173 = (($R7$0) + 20|0);
       $174 = HEAP32[$173>>2]|0;
       $175 = ($174|0)==(0|0);
       if (!($175)) {
        $R7$0 = $174;$RP9$0 = $173;
        continue;
       }
       $176 = (($R7$0) + 16|0);
       $177 = HEAP32[$176>>2]|0;
       $178 = ($177|0)==(0|0);
       if ($178) {
        break;
       } else {
        $R7$0 = $177;$RP9$0 = $176;
       }
      }
      $179 = ($RP9$0>>>0)<($106>>>0);
      if ($179) {
       _abort();
       // unreachable;
      } else {
       HEAP32[$RP9$0>>2] = 0;
       $R7$1 = $R7$0;
       break;
      }
     } else {
      $$sum17 = (($psize) + 8)|0;
      $158 = (($p) + ($$sum17)|0);
      $159 = HEAP32[$158>>2]|0;
      $160 = ($159>>>0)<($106>>>0);
      if ($160) {
       _abort();
       // unreachable;
      }
      $161 = (($159) + 12|0);
      $162 = HEAP32[$161>>2]|0;
      $163 = ($162|0)==($0|0);
      if (!($163)) {
       _abort();
       // unreachable;
      }
      $164 = (($156) + 8|0);
      $165 = HEAP32[$164>>2]|0;
      $166 = ($165|0)==($0|0);
      if ($166) {
       HEAP32[$161>>2] = $156;
       HEAP32[$164>>2] = $159;
       $R7$1 = $156;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $180 = ($154|0)==(0|0);
    if (!($180)) {
     $$sum14 = (($psize) + 28)|0;
     $181 = (($p) + ($$sum14)|0);
     $182 = HEAP32[$181>>2]|0;
     $183 = ((832 + ($182<<2)|0) + 304|0);
     $184 = HEAP32[$183>>2]|0;
     $185 = ($0|0)==($184|0);
     if ($185) {
      HEAP32[$183>>2] = $R7$1;
      $cond46 = ($R7$1|0)==(0|0);
      if ($cond46) {
       $186 = 1 << $182;
       $187 = $186 ^ -1;
       $188 = HEAP32[((832 + 4|0))>>2]|0;
       $189 = $188 & $187;
       HEAP32[((832 + 4|0))>>2] = $189;
       break;
      }
     } else {
      $190 = HEAP32[((832 + 16|0))>>2]|0;
      $191 = ($154>>>0)<($190>>>0);
      if ($191) {
       _abort();
       // unreachable;
      }
      $192 = (($154) + 16|0);
      $193 = HEAP32[$192>>2]|0;
      $194 = ($193|0)==($0|0);
      if ($194) {
       HEAP32[$192>>2] = $R7$1;
      } else {
       $195 = (($154) + 20|0);
       HEAP32[$195>>2] = $R7$1;
      }
      $196 = ($R7$1|0)==(0|0);
      if ($196) {
       break;
      }
     }
     $197 = HEAP32[((832 + 16|0))>>2]|0;
     $198 = ($R7$1>>>0)<($197>>>0);
     if ($198) {
      _abort();
      // unreachable;
     }
     $199 = (($R7$1) + 24|0);
     HEAP32[$199>>2] = $154;
     $$sum15 = (($psize) + 16)|0;
     $200 = (($p) + ($$sum15)|0);
     $201 = HEAP32[$200>>2]|0;
     $202 = ($201|0)==(0|0);
     do {
      if (!($202)) {
       $203 = ($201>>>0)<($197>>>0);
       if ($203) {
        _abort();
        // unreachable;
       } else {
        $204 = (($R7$1) + 16|0);
        HEAP32[$204>>2] = $201;
        $205 = (($201) + 24|0);
        HEAP32[$205>>2] = $R7$1;
        break;
       }
      }
     } while(0);
     $$sum16 = (($psize) + 20)|0;
     $206 = (($p) + ($$sum16)|0);
     $207 = HEAP32[$206>>2]|0;
     $208 = ($207|0)==(0|0);
     if (!($208)) {
      $209 = HEAP32[((832 + 16|0))>>2]|0;
      $210 = ($207>>>0)<($209>>>0);
      if ($210) {
       _abort();
       // unreachable;
      } else {
       $211 = (($R7$1) + 20|0);
       HEAP32[$211>>2] = $207;
       $212 = (($207) + 24|0);
       HEAP32[$212>>2] = $R7$1;
       break;
      }
     }
    }
   }
  } while(0);
  $213 = $128 | 1;
  $214 = (($$0) + 4|0);
  HEAP32[$214>>2] = $213;
  $215 = (($$0) + ($128)|0);
  HEAP32[$215>>2] = $128;
  $216 = HEAP32[((832 + 20|0))>>2]|0;
  $217 = ($$0|0)==($216|0);
  if ($217) {
   HEAP32[((832 + 8|0))>>2] = $128;
   STACKTOP = sp;return;
  } else {
   $$1 = $128;
  }
 } else {
  $218 = $109 & -2;
  HEAP32[$108>>2] = $218;
  $219 = $$02 | 1;
  $220 = (($$0) + 4|0);
  HEAP32[$220>>2] = $219;
  $221 = (($$0) + ($$02)|0);
  HEAP32[$221>>2] = $$02;
  $$1 = $$02;
 }
 $222 = $$1 >>> 3;
 $223 = ($$1>>>0)<(256);
 if ($223) {
  $224 = $222 << 1;
  $225 = ((832 + ($224<<2)|0) + 40|0);
  $226 = HEAP32[832>>2]|0;
  $227 = 1 << $222;
  $228 = $226 & $227;
  $229 = ($228|0)==(0);
  if ($229) {
   $230 = $226 | $227;
   HEAP32[832>>2] = $230;
   $$sum12$pre = (($224) + 2)|0;
   $$pre = ((832 + ($$sum12$pre<<2)|0) + 40|0);
   $$pre$phiZ2D = $$pre;$F16$0 = $225;
  } else {
   $$sum13 = (($224) + 2)|0;
   $231 = ((832 + ($$sum13<<2)|0) + 40|0);
   $232 = HEAP32[$231>>2]|0;
   $233 = HEAP32[((832 + 16|0))>>2]|0;
   $234 = ($232>>>0)<($233>>>0);
   if ($234) {
    _abort();
    // unreachable;
   } else {
    $$pre$phiZ2D = $231;$F16$0 = $232;
   }
  }
  HEAP32[$$pre$phiZ2D>>2] = $$0;
  $235 = (($F16$0) + 12|0);
  HEAP32[$235>>2] = $$0;
  $236 = (($$0) + 8|0);
  HEAP32[$236>>2] = $F16$0;
  $237 = (($$0) + 12|0);
  HEAP32[$237>>2] = $225;
  STACKTOP = sp;return;
 }
 $238 = $$1 >>> 8;
 $239 = ($238|0)==(0);
 if ($239) {
  $I19$0 = 0;
 } else {
  $240 = ($$1>>>0)>(16777215);
  if ($240) {
   $I19$0 = 31;
  } else {
   $241 = (($238) + 1048320)|0;
   $242 = $241 >>> 16;
   $243 = $242 & 8;
   $244 = $238 << $243;
   $245 = (($244) + 520192)|0;
   $246 = $245 >>> 16;
   $247 = $246 & 4;
   $248 = $247 | $243;
   $249 = $244 << $247;
   $250 = (($249) + 245760)|0;
   $251 = $250 >>> 16;
   $252 = $251 & 2;
   $253 = $248 | $252;
   $254 = (14 - ($253))|0;
   $255 = $249 << $252;
   $256 = $255 >>> 15;
   $257 = (($254) + ($256))|0;
   $258 = $257 << 1;
   $259 = (($257) + 7)|0;
   $260 = $$1 >>> $259;
   $261 = $260 & 1;
   $262 = $261 | $258;
   $I19$0 = $262;
  }
 }
 $263 = ((832 + ($I19$0<<2)|0) + 304|0);
 $264 = (($$0) + 28|0);
 $I19$0$c = $I19$0;
 HEAP32[$264>>2] = $I19$0$c;
 $265 = (($$0) + 20|0);
 HEAP32[$265>>2] = 0;
 $266 = (($$0) + 16|0);
 HEAP32[$266>>2] = 0;
 $267 = HEAP32[((832 + 4|0))>>2]|0;
 $268 = 1 << $I19$0;
 $269 = $267 & $268;
 $270 = ($269|0)==(0);
 if ($270) {
  $271 = $267 | $268;
  HEAP32[((832 + 4|0))>>2] = $271;
  HEAP32[$263>>2] = $$0;
  $272 = (($$0) + 24|0);
  HEAP32[$272>>2] = $263;
  $273 = (($$0) + 12|0);
  HEAP32[$273>>2] = $$0;
  $274 = (($$0) + 8|0);
  HEAP32[$274>>2] = $$0;
  STACKTOP = sp;return;
 }
 $275 = HEAP32[$263>>2]|0;
 $276 = ($I19$0|0)==(31);
 if ($276) {
  $284 = 0;
 } else {
  $277 = $I19$0 >>> 1;
  $278 = (25 - ($277))|0;
  $284 = $278;
 }
 $279 = (($275) + 4|0);
 $280 = HEAP32[$279>>2]|0;
 $281 = $280 & -8;
 $282 = ($281|0)==($$1|0);
 L194: do {
  if ($282) {
   $T$0$lcssa = $275;
  } else {
   $283 = $$1 << $284;
   $K20$050 = $283;$T$049 = $275;
   while(1) {
    $291 = $K20$050 >>> 31;
    $292 = ((($T$049) + ($291<<2)|0) + 16|0);
    $287 = HEAP32[$292>>2]|0;
    $293 = ($287|0)==(0|0);
    if ($293) {
     break;
    }
    $285 = $K20$050 << 1;
    $286 = (($287) + 4|0);
    $288 = HEAP32[$286>>2]|0;
    $289 = $288 & -8;
    $290 = ($289|0)==($$1|0);
    if ($290) {
     $T$0$lcssa = $287;
     break L194;
    } else {
     $K20$050 = $285;$T$049 = $287;
    }
   }
   $294 = HEAP32[((832 + 16|0))>>2]|0;
   $295 = ($292>>>0)<($294>>>0);
   if ($295) {
    _abort();
    // unreachable;
   }
   HEAP32[$292>>2] = $$0;
   $296 = (($$0) + 24|0);
   HEAP32[$296>>2] = $T$049;
   $297 = (($$0) + 12|0);
   HEAP32[$297>>2] = $$0;
   $298 = (($$0) + 8|0);
   HEAP32[$298>>2] = $$0;
   STACKTOP = sp;return;
  }
 } while(0);
 $299 = (($T$0$lcssa) + 8|0);
 $300 = HEAP32[$299>>2]|0;
 $301 = HEAP32[((832 + 16|0))>>2]|0;
 $302 = ($T$0$lcssa>>>0)>=($301>>>0);
 $303 = ($300>>>0)>=($301>>>0);
 $or$cond = $302 & $303;
 if (!($or$cond)) {
  _abort();
  // unreachable;
 }
 $304 = (($300) + 12|0);
 HEAP32[$304>>2] = $$0;
 HEAP32[$299>>2] = $$0;
 $305 = (($$0) + 8|0);
 HEAP32[$305>>2] = $300;
 $306 = (($$0) + 12|0);
 HEAP32[$306>>2] = $T$0$lcssa;
 $307 = (($$0) + 24|0);
 HEAP32[$307>>2] = 0;
 STACKTOP = sp;return;
}
function runPostSets() {
 
}
function _memset(ptr, value, num) {
    ptr = ptr|0; value = value|0; num = num|0;
    var stop = 0, value4 = 0, stop4 = 0, unaligned = 0;
    stop = (ptr + num)|0;
    if ((num|0) >= 20) {
      // This is unaligned, but quite large, so work hard to get to aligned settings
      value = value & 0xff;
      unaligned = ptr & 3;
      value4 = value | (value << 8) | (value << 16) | (value << 24);
      stop4 = stop & ~3;
      if (unaligned) {
        unaligned = (ptr + 4 - unaligned)|0;
        while ((ptr|0) < (unaligned|0)) { // no need to check for stop, since we have large num
          HEAP8[((ptr)>>0)]=value;
          ptr = (ptr+1)|0;
        }
      }
      while ((ptr|0) < (stop4|0)) {
        HEAP32[((ptr)>>2)]=value4;
        ptr = (ptr+4)|0;
      }
    }
    while ((ptr|0) < (stop|0)) {
      HEAP8[((ptr)>>0)]=value;
      ptr = (ptr+1)|0;
    }
    return (ptr-num)|0;
}
function _llvm_ctlz_i32(x) {
    x = x|0;
    var ret = 0;
    ret = ((HEAP8[(((ctlz_i8)+(x >>> 24))>>0)])|0);
    if ((ret|0) < 8) return ret|0;
    ret = ((HEAP8[(((ctlz_i8)+((x >> 16)&0xff))>>0)])|0);
    if ((ret|0) < 8) return (ret + 8)|0;
    ret = ((HEAP8[(((ctlz_i8)+((x >> 8)&0xff))>>0)])|0);
    if ((ret|0) < 8) return (ret + 16)|0;
    return (((HEAP8[(((ctlz_i8)+(x&0xff))>>0)])|0) + 24)|0;
}
function _bitshift64Lshr(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = high >>> bits;
      return (low >>> bits) | ((high&ander) << (32 - bits));
    }
    tempRet0 = 0;
    return (high >>> (bits - 32))|0;
}
function _strlen(ptr) {
    ptr = ptr|0;
    var curr = 0;
    curr = ptr;
    while (((HEAP8[((curr)>>0)])|0)) {
      curr = (curr + 1)|0;
    }
    return (curr - ptr)|0;
}
function _memcpy(dest, src, num) {

    dest = dest|0; src = src|0; num = num|0;
    var ret = 0;
    if ((num|0) >= 4096) return _emscripten_memcpy_big(dest|0, src|0, num|0)|0;
    ret = dest|0;
    if ((dest&3) == (src&3)) {
      while (dest & 3) {
        if ((num|0) == 0) return ret|0;
        HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
        dest = (dest+1)|0;
        src = (src+1)|0;
        num = (num-1)|0;
      }
      while ((num|0) >= 4) {
        HEAP32[((dest)>>2)]=((HEAP32[((src)>>2)])|0);
        dest = (dest+4)|0;
        src = (src+4)|0;
        num = (num-4)|0;
      }
    }
    while ((num|0) > 0) {
      HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
      dest = (dest+1)|0;
      src = (src+1)|0;
      num = (num-1)|0;
    }
    return ret|0;
}
function _strncpy(pdest, psrc, num) {
    pdest = pdest|0; psrc = psrc|0; num = num|0;
    var padding = 0, curr = 0, i = 0;
    while ((i|0) < (num|0)) {
      curr = padding ? 0 : ((HEAP8[(((psrc)+(i))>>0)])|0);
      HEAP8[(((pdest)+(i))>>0)]=curr;
      padding = padding ? 1 : (((HEAP8[(((psrc)+(i))>>0)])|0) == 0);
      i = (i+1)|0;
    }
    return pdest|0;
}

// EMSCRIPTEN_END_FUNCS

  
  function dynCall_iii(index,a1,a2) {
    index = index|0;
    a1=a1|0; a2=a2|0;
    return FUNCTION_TABLE_iii[index&7](a1|0,a2|0)|0;
  }


  function jsCall_iii_0(a1,a2) {
    a1=a1|0; a2=a2|0;
    return jsCall(0,a1|0,a2|0)|0;
  }



  function jsCall_iii_1(a1,a2) {
    a1=a1|0; a2=a2|0;
    return jsCall(1,a1|0,a2|0)|0;
  }



  function dynCall_viii(index,a1,a2,a3) {
    index = index|0;
    a1=a1|0; a2=a2|0; a3=a3|0;
    FUNCTION_TABLE_viii[index&63](a1|0,a2|0,a3|0);
  }


  function jsCall_viii_0(a1,a2,a3) {
    a1=a1|0; a2=a2|0; a3=a3|0;
    jsCall(0,a1|0,a2|0,a3|0);
  }



  function jsCall_viii_1(a1,a2,a3) {
    a1=a1|0; a2=a2|0; a3=a3|0;
    jsCall(1,a1|0,a2|0,a3|0);
  }


function b0(p0,p1) { p0 = p0|0;p1 = p1|0; nullFunc_iii(0);return 0; }
  function b1(p0,p1,p2) { p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_viii(1); }
  // EMSCRIPTEN_END_FUNCS
  var FUNCTION_TABLE_iii = [b0,b0,jsCall_iii_0,b0,jsCall_iii_1,b0,b0,_ctx_intern_getTableForHash];
  var FUNCTION_TABLE_viii = [b1,b1,jsCall_viii_0,b1,jsCall_viii_1,b1,_ctx_intern_scheduleMessageForReceiver,b1,_cLoadbang_7wgV6_sendMessage,_cLoadbang_1cs2d_sendMessage,_cLoadbang_TTwsH_sendMessage,_cLoadbang_fDPjS_sendMessage,_cLoadbang_UcSVL_sendMessage,_cLoadbang_yDIU9_sendMessage,_cReceive_rmVuH_sendMessage,_cReceive_1to7Z_sendMessage,_cReceive_aFSFc_sendMessage,_cReceive_ATels_sendMessage,_cVar_O4BBK_sendMessage,_cVar_mA6px_sendMessage,_cVar_siNyy_sendMessage,_cVar_yIPzC_sendMessage,_cVar_JsudP_sendMessage,_cDelay_4PipT_sendMessage,_cBinop_o98E7_sendMessage,_cBinop_fxOmb_sendMessage,_cBinop_BUZ0n_sendMessage,_cBinop_QCJvl_sendMessage,_cSystem_71nds_sendMessage
  ,_cCast_gZfDf_sendMessage,_cCast_ijWWE_sendMessage,_cSystem_KgCjQ_sendMessage,_cBinop_gYRiw_sendMessage,_cBinop_AOmhv_sendMessage,_cSystem_piVzj_sendMessage,_cBinop_Xe9Co_sendMessage,_cBinop_tzUsk_sendMessage,_cSystem_H6gkV_sendMessage,_cBinop_nU7GI_sendMessage,_cBinop_D2EVx_sendMessage,_cBinop_ahmg6_sendMessage,_cDelay_szhkK_sendMessage,_cCast_gJHmq_sendMessage,_cBinop_OBm8I_sendMessage,_cBinop_xAxNs_sendMessage,_cBinop_FHXYv_sendMessage,_cSystem_UL0PS_sendMessage,_cCast_JJFHy_sendMessage,_cCast_G0DRb_sendMessage,_cBinop_urR3C_sendMessage,_cBinop_GV5ig_sendMessage,_cBinop_h0TZk_sendMessage,_cBinop_jRgn1_sendMessage,_cBinop_0FW8Y_sendMessage,_cBinop_YZuof_sendMessage,_cDelay_3Ix66_sendMessage,_cCast_PxKCb_sendMessage,_cBinop_MRaB2_sendMessage,_cBinop_e6eAx_sendMessage
  ,_cBinop_g1ABT_sendMessage,_cBinop_f7il4_sendMessage,b1,b1,b1];

  return { _strlen: _strlen, _hv_heavy_new: _hv_heavy_new, _hv_setPrintHook: _hv_setPrintHook, _bitshift64Lshr: _bitshift64Lshr, _hv_msg_init: _hv_msg_init, _hv_msg_getByteSize: _hv_msg_getByteSize, _hv_vscheduleMessageForReceiver: _hv_vscheduleMessageForReceiver, _memset: _memset, _hv_scheduleMessageForReceiver: _hv_scheduleMessageForReceiver, _hv_heavy_process: _hv_heavy_process, _memcpy: _memcpy, _realloc: _realloc, _hv_msg_getFloat: _hv_msg_getFloat, _hv_getNumInputChannels: _hv_getNumInputChannels, _hv_heavy_process_inline: _hv_heavy_process_inline, _hv_getNumOutputChannels: _hv_getNumOutputChannels, _free: _free, _hv_heavy_free: _hv_heavy_free, _hv_msg_setFloat: _hv_msg_setFloat, _malloc: _malloc, _strncpy: _strncpy, _llvm_ctlz_i32: _llvm_ctlz_i32, runPostSets: runPostSets, stackAlloc: stackAlloc, stackSave: stackSave, stackRestore: stackRestore, setThrew: setThrew, setTempRet0: setTempRet0, getTempRet0: getTempRet0, dynCall_iii: dynCall_iii, dynCall_viii: dynCall_viii };
})
// EMSCRIPTEN_END_ASM
(Module.asmGlobalArg, Module.asmLibraryArg, buffer);
var real__strlen = asm["_strlen"]; asm["_strlen"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__strlen.apply(null, arguments);
};

var real__hv_heavy_new = asm["_hv_heavy_new"]; asm["_hv_heavy_new"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__hv_heavy_new.apply(null, arguments);
};

var real__hv_setPrintHook = asm["_hv_setPrintHook"]; asm["_hv_setPrintHook"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__hv_setPrintHook.apply(null, arguments);
};

var real__bitshift64Lshr = asm["_bitshift64Lshr"]; asm["_bitshift64Lshr"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__bitshift64Lshr.apply(null, arguments);
};

var real__hv_msg_init = asm["_hv_msg_init"]; asm["_hv_msg_init"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__hv_msg_init.apply(null, arguments);
};

var real__hv_msg_getByteSize = asm["_hv_msg_getByteSize"]; asm["_hv_msg_getByteSize"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__hv_msg_getByteSize.apply(null, arguments);
};

var real__hv_vscheduleMessageForReceiver = asm["_hv_vscheduleMessageForReceiver"]; asm["_hv_vscheduleMessageForReceiver"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__hv_vscheduleMessageForReceiver.apply(null, arguments);
};

var real__hv_scheduleMessageForReceiver = asm["_hv_scheduleMessageForReceiver"]; asm["_hv_scheduleMessageForReceiver"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__hv_scheduleMessageForReceiver.apply(null, arguments);
};

var real__hv_heavy_process = asm["_hv_heavy_process"]; asm["_hv_heavy_process"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__hv_heavy_process.apply(null, arguments);
};

var real__realloc = asm["_realloc"]; asm["_realloc"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__realloc.apply(null, arguments);
};

var real__hv_msg_getFloat = asm["_hv_msg_getFloat"]; asm["_hv_msg_getFloat"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__hv_msg_getFloat.apply(null, arguments);
};

var real__hv_getNumInputChannels = asm["_hv_getNumInputChannels"]; asm["_hv_getNumInputChannels"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__hv_getNumInputChannels.apply(null, arguments);
};

var real__hv_heavy_process_inline = asm["_hv_heavy_process_inline"]; asm["_hv_heavy_process_inline"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__hv_heavy_process_inline.apply(null, arguments);
};

var real__hv_getNumOutputChannels = asm["_hv_getNumOutputChannels"]; asm["_hv_getNumOutputChannels"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__hv_getNumOutputChannels.apply(null, arguments);
};

var real__hv_heavy_free = asm["_hv_heavy_free"]; asm["_hv_heavy_free"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__hv_heavy_free.apply(null, arguments);
};

var real__hv_msg_setFloat = asm["_hv_msg_setFloat"]; asm["_hv_msg_setFloat"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__hv_msg_setFloat.apply(null, arguments);
};

var real__strncpy = asm["_strncpy"]; asm["_strncpy"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__strncpy.apply(null, arguments);
};

var real__llvm_ctlz_i32 = asm["_llvm_ctlz_i32"]; asm["_llvm_ctlz_i32"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__llvm_ctlz_i32.apply(null, arguments);
};

var real_runPostSets = asm["runPostSets"]; asm["runPostSets"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real_runPostSets.apply(null, arguments);
};
var _strlen = Module["_strlen"] = asm["_strlen"];
var _hv_heavy_new = Module["_hv_heavy_new"] = asm["_hv_heavy_new"];
var _hv_setPrintHook = Module["_hv_setPrintHook"] = asm["_hv_setPrintHook"];
var _bitshift64Lshr = Module["_bitshift64Lshr"] = asm["_bitshift64Lshr"];
var _hv_msg_init = Module["_hv_msg_init"] = asm["_hv_msg_init"];
var _hv_msg_getByteSize = Module["_hv_msg_getByteSize"] = asm["_hv_msg_getByteSize"];
var _hv_vscheduleMessageForReceiver = Module["_hv_vscheduleMessageForReceiver"] = asm["_hv_vscheduleMessageForReceiver"];
var _memset = Module["_memset"] = asm["_memset"];
var _hv_scheduleMessageForReceiver = Module["_hv_scheduleMessageForReceiver"] = asm["_hv_scheduleMessageForReceiver"];
var _hv_heavy_process = Module["_hv_heavy_process"] = asm["_hv_heavy_process"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var _realloc = Module["_realloc"] = asm["_realloc"];
var _hv_msg_getFloat = Module["_hv_msg_getFloat"] = asm["_hv_msg_getFloat"];
var _hv_getNumInputChannels = Module["_hv_getNumInputChannels"] = asm["_hv_getNumInputChannels"];
var _hv_heavy_process_inline = Module["_hv_heavy_process_inline"] = asm["_hv_heavy_process_inline"];
var _hv_getNumOutputChannels = Module["_hv_getNumOutputChannels"] = asm["_hv_getNumOutputChannels"];
var _free = Module["_free"] = asm["_free"];
var _hv_heavy_free = Module["_hv_heavy_free"] = asm["_hv_heavy_free"];
var _hv_msg_setFloat = Module["_hv_msg_setFloat"] = asm["_hv_msg_setFloat"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _strncpy = Module["_strncpy"] = asm["_strncpy"];
var _llvm_ctlz_i32 = Module["_llvm_ctlz_i32"] = asm["_llvm_ctlz_i32"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var dynCall_iii = Module["dynCall_iii"] = asm["dynCall_iii"];
var dynCall_viii = Module["dynCall_viii"] = asm["dynCall_viii"];

Runtime.stackAlloc = asm['stackAlloc'];
Runtime.stackSave = asm['stackSave'];
Runtime.stackRestore = asm['stackRestore'];
Runtime.setTempRet0 = asm['setTempRet0'];
Runtime.getTempRet0 = asm['getTempRet0'];


// Warning: printing of i64 values may be slightly rounded! No deep i64 math used, so precise i64 code not included
var i64Math = null;

// === Auto-generated postamble setup entry stuff ===

if (memoryInitializer) {
  if (typeof Module['locateFile'] === 'function') {
    memoryInitializer = Module['locateFile'](memoryInitializer);
  } else if (Module['memoryInitializerPrefixURL']) {
    memoryInitializer = Module['memoryInitializerPrefixURL'] + memoryInitializer;
  }
  if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
    var data = Module['readBinary'](memoryInitializer);
    HEAPU8.set(data, STATIC_BASE);
  } else {
    addRunDependency('memory initializer');
    Browser.asyncLoad(memoryInitializer, function(data) {
      for (var i = 0; i < data.length; i++) {
        assert(HEAPU8[STATIC_BASE + i] === 0, "area for memory initializer should not have been touched before it's loaded");
      }
      HEAPU8.set(data, STATIC_BASE);
      removeRunDependency('memory initializer');
    }, function(data) {
      throw 'could not load memory initializer ' + memoryInitializer;
    });
  }
}

function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
};
ExitStatus.prototype = new Error();
ExitStatus.prototype.constructor = ExitStatus;

var initialStackTop;
var preloadStartTime = null;
var calledMain = false;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!Module['calledRun'] && shouldRunNow) run();
  if (!Module['calledRun']) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
}

Module['callMain'] = Module.callMain = function callMain(args) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on __ATMAIN__)');
  assert(__ATPRERUN__.length == 0, 'cannot call main when preRun functions remain to be called');

  args = args || [];

  ensureInitRuntime();

  var argc = args.length+1;
  function pad() {
    for (var i = 0; i < 4-1; i++) {
      argv.push(0);
    }
  }
  var argv = [allocate(intArrayFromString(Module['thisProgram']), 'i8', ALLOC_NORMAL) ];
  pad();
  for (var i = 0; i < argc-1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_NORMAL));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, 'i32', ALLOC_NORMAL);

  initialStackTop = STACKTOP;

  try {

    var ret = Module['_main'](argc, argv, 0);


    // if we're not running an evented main loop, it's time to exit
    exit(ret);
  }
  catch(e) {
    if (e instanceof ExitStatus) {
      // exit() throws this once it's done to make sure execution
      // has been stopped completely
      return;
    } else if (e == 'SimulateInfiniteLoop') {
      // running an evented main loop, don't immediately exit
      Module['noExitRuntime'] = true;
      return;
    } else {
      if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
      throw e;
    }
  } finally {
    calledMain = true;
  }
}




function run(args) {
  args = args || Module['arguments'];

  if (preloadStartTime === null) preloadStartTime = Date.now();

  if (runDependencies > 0) {
    Module.printErr('run() called, but dependencies remain, so not running');
    return;
  }

  preRun();

  if (runDependencies > 0) return; // a preRun added a dependency, run will be called later
  if (Module['calledRun']) return; // run may have just been called through dependencies being fulfilled just in this very frame

  function doRun() {
    if (Module['calledRun']) return; // run may have just been called while the async setStatus time below was happening
    Module['calledRun'] = true;

    if (ABORT) return; 

    ensureInitRuntime();

    preMain();

    if (ENVIRONMENT_IS_WEB && preloadStartTime !== null) {
      Module.printErr('pre-main prep time: ' + (Date.now() - preloadStartTime) + ' ms');
    }

    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();

    if (Module['_main'] && shouldRunNow) Module['callMain'](args);

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else {
    doRun();
  }
}
Module['run'] = Module.run = run;

function exit(status) {
  if (Module['noExitRuntime']) {
    Module.printErr('exit(' + status + ') called, but noExitRuntime, so not exiting');
    return;
  }

  ABORT = true;
  EXITSTATUS = status;
  STACKTOP = initialStackTop;

  // exit the runtime
  exitRuntime();

  if (ENVIRONMENT_IS_NODE) {
    // Work around a node.js bug where stdout buffer is not flushed at process exit:
    // Instead of process.exit() directly, wait for stdout flush event.
    // See https://github.com/joyent/node/issues/1669 and https://github.com/kripken/emscripten/issues/2582
    // Workaround is based on https://github.com/RReverser/acorn/commit/50ab143cecc9ed71a2d66f78b4aec3bb2e9844f6
    process['stdout']['once']('drain', function () {
      process['exit'](status);
    });
    console.log(' '); // Make sure to print something to force the drain event to occur, in case the stdout buffer was empty.
    // Work around another node bug where sometimes 'drain' is never fired - make another effort
    // to emit the exit status, after a significant delay (if node hasn't fired drain by then, give up)
    setTimeout(function() {
      process['exit'](status);
    }, 500);
  } else
  if (ENVIRONMENT_IS_SHELL && typeof quit === 'function') {
    quit(status);
  }
  // if we reach here, we must throw an exception to halt the current execution
  throw new ExitStatus(status);
}
Module['exit'] = Module.exit = exit;

function abort(text) {
  if (text) {
    Module.print(text);
    Module.printErr(text);
  }

  ABORT = true;
  EXITSTATUS = 1;

  var extra = '';

  throw 'abort() at ' + stackTrace() + extra;
}
Module['abort'] = Module.abort = abort;

// {{PRE_RUN_ADDITIONS}}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

// shouldRunNow refers to calling main(), not run().
var shouldRunNow = true;
if (Module['noInitialRun']) {
  shouldRunNow = false;
}


run();

// {{POST_RUN_ADDITIONS}}






// {{MODULE_ADDITIONS}}



