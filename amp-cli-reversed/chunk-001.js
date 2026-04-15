// @bun
var g3R = Object.create;
var {
  getPrototypeOf: $3R,
  defineProperty: dW,
  getOwnPropertyNames: v3R
} = Object;
var j3R = Object.prototype.hasOwnProperty;
function S3R(T) {
  return this[T];
}
var O3R,
  d3R,
  E3R = (T, R, a) => {
    var e = T != null && typeof T === "object";
    if (e) {
      var t = R ? O3R ??= new WeakMap() : d3R ??= new WeakMap(),
        r = t.get(T);
      if (r) return r;
    }
    a = T != null ? g3R($3R(T)) : {};
    let h = R || !T || !T.__esModule ? dW(a, "default", {
      value: T,
      enumerable: !0
    }) : a;
    for (let i of v3R(T)) if (!j3R.call(h, i)) dW(h, i, {
      get: S3R.bind(T, i),
      enumerable: !0
    });
    if (e) t.set(T, h);
    return h;
  };
var EW = (T, R) => () => (R || T((R = {
  exports: {}
}).exports, R), R.exports);
var C3R = T => T;
function L3R(T, R) {
  this[T] = C3R.bind(null, R);
}
var M3R = (T, R) => {
  for (var a in R) dW(T, a, {
    get: R[a],
    enumerable: !0,
    configurable: !0,
    set: L3R.bind(R, a)
  });
};
var D3R = (T, R) => () => (T && (R = T(T = 0)), R);
var G8 = import.meta.require;
var LhT = EW((fF0, w3R) => {
  w3R.exports = G8("/$bunfs/root/keyring.darwin-arm64-cqyn4aeg.node");
});
var MhT = EW((gF0, mu) => {
  var __filename = "/home/runner/work/amp/amp/node_modules/.pnpm/@napi-rs+keyring@1.1.10/node_modules/@napi-rs/keyring/index.js",
    {
      createRequire: B3R
    } = G8("module");
  G8 = B3R(__filename);
  var {
      readFileSync: IF0
    } = G8("fs"),
    zh = null,
    _o = [];
  function N3R() {
    if (process.env.NAPI_RS_NATIVE_LIBRARY_PATH) try {
      zh = G8(process.env.NAPI_RS_NATIVE_LIBRARY_PATH);
    } catch (T) {
      _o.push(T);
    } else {
      try {
        return (() => {
          throw new Error("Cannot require module " + "./keyring.darwin-universal.node");
        })();
      } catch (T) {
        _o.push(T);
      }
      try {
        let T = (() => {
            throw new Error("Cannot require module " + "@napi-rs/keyring-darwin-universal");
          })(),
          R = (() => {
            throw new Error("Cannot require module " + "@napi-rs/keyring-darwin-universal/package.json");
          })().version;
        if (R !== "1.1.10" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw Error(`Native binding package version mismatch, expected 1.1.10 but got ${R}. You can reinstall dependencies to fix this issue.`);
        return T;
      } catch (T) {
        _o.push(T);
      }
      try {
        return (() => {
          throw new Error("Cannot require module " + "./keyring.darwin-arm64.node");
        })();
      } catch (T) {
        _o.push(T);
      }
      try {
        let T = (() => {
            throw new Error("Cannot require module " + "@napi-rs/keyring-darwin-arm64");
          })(),
          R = (() => {
            throw new Error("Cannot require module " + "@napi-rs/keyring-darwin-arm64/package.json");
          })().version;
        if (R !== "1.1.10" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw Error(`Native binding package version mismatch, expected 1.1.10 but got ${R}. You can reinstall dependencies to fix this issue.`);
        return T;
      } catch (T) {
        _o.push(T);
      }
    }
  }
  zh = N3R();
  if (!zh || process.env.NAPI_RS_FORCE_WASI) {
    try {
      zh = (() => {
        throw new Error("Cannot require module " + "./keyring.wasi.cjs");
      })();
    } catch (T) {
      if (process.env.NAPI_RS_FORCE_WASI) _o.push(T);
    }
    if (!zh) try {
      zh = (() => {
        throw new Error("Cannot require module " + "@napi-rs/keyring-wasm32-wasi");
      })();
    } catch (T) {
      if (process.env.NAPI_RS_FORCE_WASI) _o.push(T);
    }
  }
  if (!zh) {
    if (_o.length > 0) throw Error("Cannot find native binding. npm has a bug related to optional dependencies (https://github.com/npm/cli/issues/4828). Please try `npm i` again after removing both package-lock.json and node_modules directory.", {
      cause: _o
    });
    throw Error("Failed to load native binding");
  }
  mu.exports = zh;
  mu.exports.AsyncEntry = zh.AsyncEntry;
  mu.exports.Entry = zh.Entry;
  mu.exports.findCredentials = zh.findCredentials;
  mu.exports.findCredentialsAsync = zh.findCredentialsAsync;
});
var c3R = {};
M3R(c3R, {
  meetsNodeVersion: () => yF0
});
import { createRequire as U3R } from "module";
import xnR from "os";
import bE from "path";
import { homedir as LW } from "os";
import Np from "path";
import { randomFillSync as XnR } from "crypto";
import { execFile as hAR, spawnSync as jD } from "child_process";
import lk from "fs";
import CiT from "os";
import Ai from "path";
import { promisify as iAR } from "util";
import { execFile as MAR, spawnSync as fCT } from "child_process";
import lN from "fs";
import qiT from "os";
import Rn from "path";
import { promisify as DAR } from "util";
import Sj from "fs";
import DCT from "path";
import { randomBytes as IpR } from "crypto";
import * as $r from "fs/promises";
import * as T9T from "path";
import kmR from "path";
import joT from "path";
import dN from "process";
import { PassThrough as QyR } from "stream";
import ikR from "os";
import glT from "path";
import NkR from "os";
import YkR from "os";
import { statSync as zwT, createReadStream as HIR, promises as WIR } from "fs";
import { basename as qIR } from "path";
import Xl, { PassThrough as EAT } from "stream";
import { types as YwT, deprecate as l5, promisify as agR } from "util";
import { Buffer as ri } from "buffer";
import { types as CAT } from "util";
import _C from "http";
import { isIP as cgR } from "net";
import { format as pgR } from "url";
import { deprecate as _gR } from "util";
import ygR from "http";
import PgR from "https";
import wu from "zlib";
import DAT, { PassThrough as wAT, pipeline as Bu } from "stream";
import { Buffer as bC } from "buffer";
import { createWriteStream as VgR } from "fs";
import * as tU from "fs/promises";
import { writeFile as XgR } from "fs/promises";
import { Readable as YgR } from "stream";
import { finished as QgR } from "stream/promises";
import * as OBT from "path";
import { deprecate as pMR } from "util";
import { inspect as bMR } from "util";
import { statSync as qMR, createReadStream as zMR, promises as VHT } from "fs";
import { basename as FMR } from "path";
import { ReadStream as YMR } from "fs";
import { Readable as QMR } from "stream";
import { ReadableStream as ZMR } from "stream/web";
import { writeFile as _wR } from "fs/promises";
import { execFile as WwR } from "child_process";
import * as J3T from "fs";
import * as TaT from "os";
import * as RaT from "path";
import { promisify as qwR } from "util";
import { createHash as xBR } from "crypto";
import { writeFile as $mT } from "fs/promises";
import { tmpdir as fBR } from "os";
import { join as IBR } from "path";
import { spawn as jBR } from "child_process";
import * as Nx from "fs";
import * as tqT from "path";
import { openSync as DUR } from "fs";
import wmT from "tty";
import { spawn as qmT } from "child_process";
import { randomBytes as I5T } from "crypto";
import { once as qUR } from "events";
import { mkdir as g5T, readFile as $5T, writeFile as zUR } from "fs/promises";
import v5T from "os";
import AA from "path";
import { stderr as Be, stdout as C9 } from "process";
import { Readable as FUR } from "stream";
import { pipeline as GUR } from "stream/promises";
import { exec as KUR } from "child_process";
import { platform as VUR } from "os";
import { promisify as XUR } from "util";
import YUR from "fs";
import QUR from "os";
import { randomBytes as lHR } from "crypto";
import * as E5T from "http";
import { URL as AHR } from "url";
import { randomBytes as fHR } from "crypto";
import * as gi from "fs/promises";
import * as MX from "path";
import { randomUUID as IHR } from "crypto";
import * as ch from "fs";
import * as NU from "path";
import { spawn as EHR } from "child_process";
import * as w5T from "fs/promises";
import * as UU from "path";
import { exec as CHR } from "child_process";
import { createHash as LHR } from "crypto";
import { createWriteStream as MHR, existsSync as B5T } from "fs";
import { chmod as DHR, mkdir as wHR, readFile as BHR, rename as NHR, unlink as UHR } from "fs/promises";
import iz from "os";
import rw from "path";
import { Readable as HHR } from "stream";
import { pipeline as WHR } from "stream/promises";
import qHR from "util";
import { basename as cWR, extname as H5T } from "path";
import { exec as sWR } from "child_process";
import { readFile as oWR } from "fs/promises";
import { promisify as nWR } from "util";
import l$ from "path";
import { existsSync as EWR } from "fs";
import { chmod as suT, mkdtemp as CWR, rm as LWR, writeFile as MWR } from "fs/promises";
import { tmpdir as DWR } from "os";
import { dirname as wWR, join as ouT } from "path";
import { createInterface as BWR } from "readline";
import { execSync as HWR, spawn as WWR } from "child_process";
import * as Y5T from "fs";
import { existsSync as Xu, promises as rqR } from "fs";
import DX from "os";
import { join as xt, resolve as hqR } from "path";
import { spawn as Q5T } from "child_process";
import { randomBytes as iqR } from "crypto";
import { cpSync as _uT, existsSync as Ft, mkdirSync as BX, readdirSync as jaT, readFileSync as Z5T, rmSync as Rb, writeFileSync as cqR } from "fs";
import { tmpdir as sqR } from "os";
import { basename as oqR, join as u3 } from "path";
import { existsSync as yuT, lstatSync as kqR, readdirSync as xqR, readFileSync as RzT, statSync as fqR } from "fs";
import { join as hw } from "path";
import Yu from "path";
import { access as RzR, realpath as azR } from "fs/promises";
import ezR from "path";
import { existsSync as Av } from "fs";
import { execFile as dzR, execFileSync as EzR } from "child_process";
import CzR from "path";
import { promisify as LzR } from "util";
import { StringDecoder as BzR } from "string_decoder";
import { stripVTControlCharacters as NzR } from "util";
import qzR from "os";
import { execFile as iFR } from "child_process";
import { promisify as cFR } from "util";
import * as zU from "path";
import { exec as BFR } from "child_process";
import { promisify as NFR } from "util";
import { join as UFR } from "path";
import { mkdir as HFR, writeFile as WFR } from "fs/promises";
import { dirname as qFR, isAbsolute as zFR, join as FFR, relative as GFR, resolve as KFR } from "path";
import { execFile as G2R } from "child_process";
import * as zzT from "fs";
import * as FzT from "os";
import * as GzT from "path";
import { promisify as K2R } from "util";
import { writeFile as TGR } from "fs/promises";
import { readFile as KuT, stat as OKR } from "fs/promises";
import { extname as dKR } from "path";
import { ReadableStream as EKR } from "stream/web";
import { pipeline as VuT, PassThrough as CKR, Readable as LKR } from "stream";
import { stat as MKR } from "fs/promises";
import { open as HKR } from "fs/promises";
import { promises as hyT } from "fs";
import AM from "path";
import { exec as uz, execFile as BXR } from "child_process";
import { basename as NXR } from "path";
import UaT from "process";
import VXR from "os";
import oyT from "tty";
import * as nFT from "child_process";
import * as lFT from "fs/promises";
import * as AFT from "path";
import { promisify as u1R } from "util";
import Zr0 from "events";
import jr from "fs";
import { EventEmitter as veT } from "events";
import $GT from "stream";
import { StringDecoder as Jr0 } from "string_decoder";
import vGT from "path";
import wy from "fs";
import { dirname as Th0, parse as Rh0 } from "path";
import { EventEmitter as ah0 } from "events";
import g1 from "assert";
import { Buffer as tb } from "buffer";
import * as LPT from "zlib";
import eh0 from "zlib";
import { posix as ey } from "path";
import { basename as th0 } from "path";
import kw from "fs";
import fs from "fs";
import MPT from "path";
import { win32 as rh0 } from "path";
import DPT from "path";
import jGT from "fs";
import hh0 from "assert";
import { randomBytes as SGT } from "crypto";
import o8 from "fs";
import Ha from "path";
import OGT from "fs";
import eH from "fs";
import mv from "path";
import bh from "fs";
import ih0 from "fs/promises";
import xw from "path";
import { join as dGT } from "path";
import lh from "fs";
import EGT from "path";
import K1 from "fs";
import BeT from "path";
import { execFile as fc0 } from "child_process";
import { promisify as Ic0 } from "util";
import { stderr as ul } from "process";
import { once as $l0 } from "events";
import { createInterface as vl0 } from "readline";
import { mkdir as SkT, open as Ql0, readFile as OkT, unlink as dkT, writeFile as hF } from "fs/promises";
import { homedir as Zl0 } from "os";
import AS from "path";
import aA0 from "os";
import S4 from "path";
import { exec as eA0, execFile as tA0, execSync as EkT } from "child_process";
import { promises as iF } from "fs";
import { join as y$ } from "path";
import { promisify as zKT } from "util";
import { EventEmitter as cA0 } from "events";
import { promises as sA0 } from "fs";
import { relative as oA0 } from "path";
import { spawn as lA0 } from "child_process";
import { promises as b_ } from "fs";
import { realpath as CkT } from "fs/promises";
import { dirname as AA0, join as lg, relative as Ag, resolve as pA0 } from "path";
import { execFile as yA0 } from "child_process";
import { EventEmitter as PA0 } from "events";
import { promises as d4, watch as kA0 } from "fs";
import { join as sF, resolve as xA0 } from "path";
import { promisify as fA0 } from "util";
import * as QKT from "readline";
import pg from "path";
import { execFile as UA0 } from "child_process";
import { readFile as HA0, stat as WA0 } from "fs/promises";
import { basename as qA0, join as zA0 } from "path";
import eVT from "process";
import { promisify as FA0 } from "util";
import { stderr as Qi, stdin as R_0 } from "process";
import { createInterface as a_0 } from "readline";
import { stdout as e_0 } from "process";
import { readFileSync as o_0, rmSync as n_0 } from "fs";
import { mkdir as l_0, readFile as A_0, rm as rY, writeFile as p_0 } from "fs/promises";
import mVT from "path";
import hY, { promises as _S } from "fs";
import { homedir as PVT } from "os";
import Ih from "path";
import { promises as yl } from "fs";
import bg from "path";
import O_0, { promises as Ow } from "fs";
import d_0 from "path";
import { stderr as QkT, stdout as E_0 } from "process";
import { mkdir as lb0, writeFile as Ab0 } from "fs/promises";
import H_ from "os";
import mh from "path";
import { stdout as mg } from "process";
import { chmodSync as pb0, existsSync as dVT, mkdirSync as _b0, writeFileSync as exT } from "fs";
import { spawn as bb0 } from "child_process";
import { constants as txT } from "fs";
import { access as mb0 } from "fs/promises";
import * as EVT from "os";
import { join as lF } from "path";
import { realpath as $b0, stat as vb0 } from "fs/promises";
import { dirname as hxT, join as jb0 } from "path";
import * as oY from "os";
import { execSync as Eb0 } from "child_process";
import { createHash as Cb0 } from "crypto";
import { chmodSync as wVT, existsSync as ptT, mkdirSync as Lb0, readFileSync as Mb0, renameSync as jv, unlinkSync as _tT, writeFileSync as Db0 } from "fs";
import { homedir as wb0 } from "os";
import { extname as Bb0, join as mS } from "path";
import { execSync as AF } from "child_process";
import { createHash as Xb0 } from "crypto";
import { existsSync as Sl, mkdirSync as Yb0, readFileSync as HVT, renameSync as nxT, rmSync as k$, writeFileSync as Qb0 } from "fs";
import { homedir as Zb0 } from "os";
import { join as gs } from "path";
import { execSync as lxT } from "child_process";
import { stderr as Xi } from "process";
import { execSync as KVT } from "child_process";
import { closeSync as _xT, openSync as um0, writeSync as ym0 } from "fs";
import Pm0 from "tty";
import { exec as Eu0, execSync as Cu0 } from "child_process";
import { openSync as Mu0 } from "fs";
import OxT from "tty";
import { createRequire as Du0 } from "module";
import { execFile as oy0 } from "child_process";
import { lstat as tXT, mkdir as ny0, readFile as ly0, rm as ftT, writeFile as Ay0 } from "fs/promises";
import yh from "path";
import Ne from "process";
import { createInterface as py0 } from "readline";
import { promisify as _y0 } from "util";
import { mkdir as by0, readFile as my0, rm as mY, writeFile as uy0 } from "fs/promises";
import yy0 from "path";
import { createServer as EXT } from "http";
import { createInterface as ek0 } from "readline";
import gk0 from "http";
import { execSync as YxT } from "child_process";
import { execFile as E_ } from "child_process";
import { existsSync as Ok0 } from "fs";
import { platform as wM } from "os";
import { promisify as dk0 } from "util";
import { default as os } from "path";
import { default as Ng0 } from "process";
import { fileURLToPath as Ug0 } from "url";
import { access as VO0, constants as XO0 } from "fs/promises";
import { open as YO0, stat as QO0 } from "fs/promises";
import { execFileSync as LQT } from "child_process";
import G4 from "fs";
import td0 from "os";
import RQ from "path";
import { execSync as rd0 } from "child_process";
import { execSync as cd0 } from "child_process";
import { mkdtemp as sd0, readFile as od0, rmdir as nd0, unlink as ld0, writeFile as Ad0 } from "fs/promises";
import { tmpdir as pd0 } from "os";
import { join as cIT } from "path";
import orT from "path";
import { copyFile as jd0, mkdir as Sd0, stat as Od0 } from "fs/promises";
import { homedir as dd0, platform as Ed0 } from "os";
import eQ from "path";
import { createHash as Md0 } from "crypto";
import { mkdir as Dd0, readFile as zQT, writeFile as wd0 } from "fs/promises";
import { tmpdir as Bd0 } from "os";
import tB from "path";
import { mkdtemp as pE0, readFile as _E0, rmdir as bE0, unlink as mE0, writeFile as uE0 } from "fs/promises";
import { tmpdir as yE0 } from "os";
import mIT from "path";
import { randomBytes as PE0 } from "crypto";
import kE0 from "fs";
import { writeFile as xE0 } from "fs/promises";
import { tmpdir as fE0 } from "os";
import rB from "path";
import { isDeepStrictEqual as FF } from "util";
import { stderr as LC0 } from "process";
import { exec as YC0 } from "child_process";
import { platform as QC0 } from "os";
import { stderr as Ay } from "process";
import { exec as R40 } from "child_process";
import { existsSync as a40 } from "fs";
import { platform as e40 } from "os";
import vIT from "path";
import { stderr as py, stdout as Ig } from "process";
import { execFile as h40 } from "child_process";
import rA from "path";
import { promisify as i40 } from "util";
import { stderr as _y, stdout as W8 } from "process";
import { fstatSync as $40, readlinkSync as v40 } from "fs";
import { spawn as E40 } from "child_process";
import { stdout as Q4 } from "process";
import { readFile as EL0 } from "fs/promises";
import * as pJT from "path";
import { Console as CL0 } from "console";
import * as bJT from "fs";
import { join as zL0 } from "path";
import { Console as VL0 } from "console";
import { randomBytes as iD0 } from "crypto";
import { readFile as cD0 } from "fs/promises";
import sD0 from "readline";
import { setTimeout as oD0 } from "timers/promises";
import $g from "fs";
import SD0 from "net";
import OD0 from "os";
import dD0 from "path";
import ED0 from "readline";
import * as Rx from "fs";
import * as KJT from "os";
import * as pB from "path";
import { execFile as m70 } from "child_process";
import { randomBytes as u70 } from "crypto";
import { mkdtemp as y70, readFile as P70, rmdir as k70, unlink as x70, writeFile as f70 } from "fs/promises";
import { homedir as I70, tmpdir as g70 } from "os";
import Eo from "path";
import { execFile as _N0 } from "child_process";
import { randomBytes as bN0 } from "crypto";
import { existsSync as mN0 } from "fs";
import { copyFile as uN0, stat as GrT, unlink as zTR, writeFile as FTR } from "fs/promises";
import { platform as GTR, tmpdir as yN0 } from "os";
import { join as PN0 } from "path";
import { promisify as kN0 } from "util";
import ngT from "path";
import { execSync as C_ } from "child_process";
import { writeFile as ZP } from "fs/promises";
import OU0 from "os";
import ys from "path";
import { homedir as nH0 } from "os";
import lH0 from "path";
import { createHash as AH0 } from "crypto";
import { createWriteStream as pH0, existsSync as kB, readdirSync as _H0, readFileSync as bH0 } from "fs";
import { copyFile as mH0, mkdir as uH0, readFile as yH0, rename as PH0, unlink as kH0 } from "fs/promises";
import { homedir as fgT, platform as ehT } from "os";
import kA from "path";
import { Readable as xH0 } from "stream";
import { pipeline as fH0 } from "stream/promises";
import { createWriteStream as IH0, existsSync as gH0, mkdirSync as $H0, readdirSync as vH0, rmSync as jH0 } from "fs";
import { writeFile as SH0 } from "fs/promises";
import Hv from "path";
import { pipeline as OH0 } from "stream/promises";
import xW0 from "path";
import { Buffer as iq0 } from "buffer";
import dgT from "path";
import { homedir as phT, platform as O$ } from "os";
import { dirname as iz0, join as jS, normalize as cz0, relative as _hT, sep as sz0 } from "path";
import { fileURLToPath as gW } from "url";
import { stdout as Sz0 } from "process";
function F3R(T) {
  return this[T];
}
function X3R(T, R) {
  this[T] = V3R.bind(null, R);
}
function nR(T, R, a) {
  function e(i, c) {
    if (!i._zod) Object.defineProperty(i, "_zod", {
      value: {
        def: c,
        constr: h,
        traits: new Set()
      },
      enumerable: !1
    });
    if (i._zod.traits.has(T)) return;
    i._zod.traits.add(T), R(i, c);
    let s = h.prototype,
      A = Object.keys(s);
    for (let l = 0; l < A.length; l++) {
      let o = A[l];
      if (!(o in i)) i[o] = s[o].bind(i);
    }
  }
  let t = a?.Parent ?? Object;
  class r extends t {}
  Object.defineProperty(r, "name", {
    value: T
  });
  function h(i) {
    var c;
    let s = a?.Parent ? new r() : this;
    e(s, i), (c = s._zod).deferred ?? (c.deferred = []);
    for (let A of s._zod.deferred) A();
    return s;
  }
  return Object.defineProperty(h, "init", {
    value: e
  }), Object.defineProperty(h, Symbol.hasInstance, {
    value: i => {
      if (a?.Parent && i instanceof a.Parent) return !0;
      return i?._zod?.traits?.has(T);
    }
  }), Object.defineProperty(h, "name", {
    value: T
  }), h;
}
function st(T) {
  if (T) Object.assign(Fv, T);
  return Fv;
}
function miR(T) {
  return T;
}
function uiR(T) {
  return T;
}
function yiR(T) {}
function PiR(T) {
  throw Error("Unexpected value in exhaustive check");
}
function kiR(T) {}
function GZ(T) {
  let R = Object.values(T).filter(a => typeof a === "number");
  return Object.entries(T).filter(([a, e]) => R.indexOf(+a) === -1).map(([a, e]) => e);
}
function ZR(T, R = "|") {
  return T.map(a => A9(a)).join(R);
}
function tD(T, R) {
  if (typeof R === "bigint") return R.toString();
  return R;
}
function d$(T) {
  return {
    get value() {
      {
        let R = T();
        return Object.defineProperty(this, "value", {
          value: R
        }), R;
      }
      throw Error("cached value already set");
    }
  };
}
function k_(T) {
  return T === null || T === void 0;
}
function sL(T) {
  let R = T.startsWith("^") ? 1 : 0,
    a = T.endsWith("$") ? T.length - 1 : T.length;
  return T.slice(R, a);
}
function WvT(T, R) {
  let a = (T.toString().split(".")[1] || "").length,
    e = R.toString(),
    t = (e.split(".")[1] || "").length;
  if (t === 0 && /\d?e-\d?/.test(e)) {
    let c = e.match(/\d?e-(\d?)/);
    if (c?.[1]) t = Number.parseInt(c[1]);
  }
  let r = a > t ? a : t,
    h = Number.parseInt(T.toFixed(r).replace(".", "")),
    i = Number.parseInt(R.toFixed(r).replace(".", ""));
  return h % i / 10 ** r;
}
function W9(T, R, a) {
  let e = void 0;
  Object.defineProperty(T, R, {
    get() {
      if (e === n2) return;
      if (e === void 0) e = n2, e = a();
      return e;
    },
    set(t) {
      Object.defineProperty(T, R, {
        value: t
      });
    },
    configurable: !0
  });
}
function xiR(T) {
  return Object.create(Object.getPrototypeOf(T), Object.getOwnPropertyDescriptors(T));
}
function HA(T, R, a) {
  Object.defineProperty(T, R, {
    value: a,
    writable: !0,
    enumerable: !0,
    configurable: !0
  });
}
function Sn(...T) {
  let R = {};
  for (let a of T) {
    let e = Object.getOwnPropertyDescriptors(a);
    Object.assign(R, e);
  }
  return Object.defineProperties({}, R);
}
function fiR(T) {
  return Sn(T._zod.def);
}
function IiR(T, R) {
  if (!R) return T;
  return R.reduce((a, e) => a?.[e], T);
}
function giR(T) {
  let R = Object.keys(T),
    a = R.map(e => T[e]);
  return Promise.all(a).then(e => {
    let t = {};
    for (let r = 0; r < R.length; r++) t[R[r]] = e[r];
    return t;
  });
}
function $iR(T = 10) {
  let R = "";
  for (let a = 0; a < T; a++) R += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
  return R;
}
function o2(T) {
  return JSON.stringify(T);
}
function qvT(T) {
  return T.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
function _P(T) {
  return typeof T === "object" && T !== null && !Array.isArray(T);
}
function jb(T) {
  if (_P(T) === !1) return !1;
  let R = T.constructor;
  if (R === void 0) return !0;
  if (typeof R !== "function") return !0;
  let a = R.prototype;
  if (_P(a) === !1) return !1;
  if (Object.prototype.hasOwnProperty.call(a, "isPrototypeOf") === !1) return !1;
  return !0;
}
function zvT(T) {
  if (jb(T)) return {
    ...T
  };
  if (Array.isArray(T)) return [...T];
  return T;
}
function viR(T) {
  let R = 0;
  for (let a in T) if (Object.prototype.hasOwnProperty.call(T, a)) R++;
  return R;
}
function Xo(T) {
  return T.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function di(T, R, a) {
  let e = new T._zod.constr(R ?? T._zod.def);
  if (!R || a?.parent) e._zod.parent = T;
  return e;
}
function a0(T) {
  let R = T;
  if (!R) return {};
  if (typeof R === "string") return {
    error: () => R
  };
  if (R?.message !== void 0) {
    if (R?.error !== void 0) throw Error("Cannot specify both `message` and `error` params");
    R.error = R.message;
  }
  if (delete R.message, typeof R.error === "string") return {
    ...R,
    error: () => R.error
  };
  return R;
}
function jiR(T) {
  let R;
  return new Proxy({}, {
    get(a, e, t) {
      return R ?? (R = T()), Reflect.get(R, e, t);
    },
    set(a, e, t, r) {
      return R ?? (R = T()), Reflect.set(R, e, t, r);
    },
    has(a, e) {
      return R ?? (R = T()), Reflect.has(R, e);
    },
    deleteProperty(a, e) {
      return R ?? (R = T()), Reflect.deleteProperty(R, e);
    },
    ownKeys(a) {
      return R ?? (R = T()), Reflect.ownKeys(R);
    },
    getOwnPropertyDescriptor(a, e) {
      return R ?? (R = T()), Reflect.getOwnPropertyDescriptor(R, e);
    },
    defineProperty(a, e, t) {
      return R ?? (R = T()), Reflect.defineProperty(R, e, t);
    }
  });
}
function A9(T) {
  if (typeof T === "bigint") return T.toString() + "n";
  if (typeof T === "string") return `"${T}"`;
  return `${T}`;
}
function FvT(T) {
  return Object.keys(T).filter(R => {
    return T[R]._zod.optin === "optional" && T[R]._zod.optout === "optional";
  });
}
function SiR(T, R) {
  let a = T._zod.def,
    e = a.checks;
  if (e && e.length > 0) throw Error(".pick() cannot be used on object schemas containing refinements");
  let t = Sn(T._zod.def, {
    get shape() {
      let r = {};
      for (let h in R) {
        if (!(h in a.shape)) throw Error(`Unrecognized key: "${h}"`);
        if (!R[h]) continue;
        r[h] = a.shape[h];
      }
      return HA(this, "shape", r), r;
    },
    checks: []
  });
  return di(T, t);
}
function OiR(T, R) {
  let a = T._zod.def,
    e = a.checks;
  if (e && e.length > 0) throw Error(".omit() cannot be used on object schemas containing refinements");
  let t = Sn(T._zod.def, {
    get shape() {
      let r = {
        ...T._zod.def.shape
      };
      for (let h in R) {
        if (!(h in a.shape)) throw Error(`Unrecognized key: "${h}"`);
        if (!R[h]) continue;
        delete r[h];
      }
      return HA(this, "shape", r), r;
    },
    checks: []
  });
  return di(T, t);
}
function diR(T, R) {
  if (!jb(R)) throw Error("Invalid input to extend: expected a plain object");
  let a = T._zod.def.checks;
  if (a && a.length > 0) {
    let t = T._zod.def.shape;
    for (let r in R) if (Object.getOwnPropertyDescriptor(t, r) !== void 0) throw Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
  }
  let e = Sn(T._zod.def, {
    get shape() {
      let t = {
        ...T._zod.def.shape,
        ...R
      };
      return HA(this, "shape", t), t;
    }
  });
  return di(T, e);
}
function EiR(T, R) {
  if (!jb(R)) throw Error("Invalid input to safeExtend: expected a plain object");
  let a = Sn(T._zod.def, {
    get shape() {
      let e = {
        ...T._zod.def.shape,
        ...R
      };
      return HA(this, "shape", e), e;
    }
  });
  return di(T, a);
}
function CiR(T, R) {
  let a = Sn(T._zod.def, {
    get shape() {
      let e = {
        ...T._zod.def.shape,
        ...R._zod.def.shape
      };
      return HA(this, "shape", e), e;
    },
    get catchall() {
      return R._zod.def.catchall;
    },
    checks: []
  });
  return di(T, a);
}
function LiR(T, R, a) {
  let e = R._zod.def.checks;
  if (e && e.length > 0) throw Error(".partial() cannot be used on object schemas containing refinements");
  let t = Sn(R._zod.def, {
    get shape() {
      let r = R._zod.def.shape,
        h = {
          ...r
        };
      if (a) for (let i in a) {
        if (!(i in r)) throw Error(`Unrecognized key: "${i}"`);
        if (!a[i]) continue;
        h[i] = T ? new T({
          type: "optional",
          innerType: r[i]
        }) : r[i];
      } else for (let i in r) h[i] = T ? new T({
        type: "optional",
        innerType: r[i]
      }) : r[i];
      return HA(this, "shape", h), h;
    },
    checks: []
  });
  return di(R, t);
}
function MiR(T, R, a) {
  let e = Sn(R._zod.def, {
    get shape() {
      let t = R._zod.def.shape,
        r = {
          ...t
        };
      if (a) for (let h in a) {
        if (!(h in r)) throw Error(`Unrecognized key: "${h}"`);
        if (!a[h]) continue;
        r[h] = new T({
          type: "nonoptional",
          innerType: t[h]
        });
      } else for (let h in t) r[h] = new T({
        type: "nonoptional",
        innerType: t[h]
      });
      return HA(this, "shape", r), r;
    }
  });
  return di(R, e);
}
function z_(T, R = 0) {
  if (T.aborted === !0) return !0;
  for (let a = R; a < T.issues.length; a++) if (T.issues[a]?.continue !== !0) return !0;
  return !1;
}
function cc(T, R) {
  return R.map(a => {
    var e;
    return (e = a).path ?? (e.path = []), a.path.unshift(T), a;
  });
}
function Eg(T) {
  return typeof T === "string" ? T : T?.message;
}
function bi(T, R, a) {
  let e = {
    ...T,
    path: T.path ?? []
  };
  if (!T.message) {
    let t = Eg(T.inst?._zod.def?.error?.(T)) ?? Eg(R?.error?.(T)) ?? Eg(a.customError?.(T)) ?? Eg(a.localeError?.(T)) ?? "Invalid input";
    e.message = t;
  }
  if (delete e.inst, delete e.continue, !R?.reportInput) delete e.input;
  return e;
}
function oL(T) {
  if (T instanceof Set) return "set";
  if (T instanceof Map) return "map";
  if (T instanceof File) return "file";
  return "unknown";
}
function nL(T) {
  if (Array.isArray(T)) return "array";
  if (typeof T === "string") return "string";
  return "unknown";
}
function u9(T) {
  let R = typeof T;
  switch (R) {
    case "number":
      return Number.isNaN(T) ? "nan" : "number";
    case "object":
      {
        if (T === null) return "null";
        if (Array.isArray(T)) return "array";
        let a = T;
        if (a && Object.getPrototypeOf(a) !== Object.prototype && "constructor" in a && a.constructor) return a.constructor.name;
      }
  }
  return R;
}
function rD(...T) {
  let [R, a, e] = T;
  if (typeof R === "string") return {
    message: R,
    code: "custom",
    input: a,
    inst: e
  };
  return {
    ...R
  };
}
function DiR(T) {
  return Object.entries(T).filter(([R, a]) => {
    return Number.isNaN(Number.parseInt(R, 10));
  }).map(R => R[1]);
}
function GvT(T) {
  let R = atob(T),
    a = new Uint8Array(R.length);
  for (let e = 0; e < R.length; e++) a[e] = R.charCodeAt(e);
  return a;
}
function KvT(T) {
  let R = "";
  for (let a = 0; a < T.length; a++) R += String.fromCharCode(T[a]);
  return btoa(R);
}
function wiR(T) {
  let R = T.replace(/-/g, "+").replace(/_/g, "/"),
    a = "=".repeat((4 - R.length % 4) % 4);
  return GvT(R + a);
}
function BiR(T) {
  return KvT(T).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function NiR(T) {
  let R = T.replace(/^0x/, "");
  if (R.length % 2 !== 0) throw Error("Invalid hex string length");
  let a = new Uint8Array(R.length / 2);
  for (let e = 0; e < R.length; e += 2) a[e / 2] = Number.parseInt(R.slice(e, e + 2), 16);
  return a;
}
function UiR(T) {
  return Array.from(T).map(R => R.toString(16).padStart(2, "0")).join("");
}
class VvT {
  constructor(...T) {}
}
function QZ(T, R = a => a.message) {
  let a = {},
    e = [];
  for (let t of T.issues) if (t.path.length > 0) a[t.path[0]] = a[t.path[0]] || [], a[t.path[0]].push(R(t));else e.push(R(t));
  return {
    formErrors: e,
    fieldErrors: a
  };
}
function ZZ(T, R = a => a.message) {
  let a = {
      _errors: []
    },
    e = t => {
      for (let r of t.issues) if (r.code === "invalid_union" && r.errors.length) r.errors.map(h => e({
        issues: h
      }));else if (r.code === "invalid_key") e({
        issues: r.issues
      });else if (r.code === "invalid_element") e({
        issues: r.issues
      });else if (r.path.length === 0) a._errors.push(R(r));else {
        let h = a,
          i = 0;
        while (i < r.path.length) {
          let c = r.path[i];
          if (i !== r.path.length - 1) h[c] = h[c] || {
            _errors: []
          };else h[c] = h[c] || {
            _errors: []
          }, h[c]._errors.push(R(r));
          h = h[c], i++;
        }
      }
    };
  return e(T), a;
}
function XvT(T, R = a => a.message) {
  let a = {
      errors: []
    },
    e = (t, r = []) => {
      var h, i;
      for (let c of t.issues) if (c.code === "invalid_union" && c.errors.length) c.errors.map(s => e({
        issues: s
      }, c.path));else if (c.code === "invalid_key") e({
        issues: c.issues
      }, c.path);else if (c.code === "invalid_element") e({
        issues: c.issues
      }, c.path);else {
        let s = [...r, ...c.path];
        if (s.length === 0) {
          a.errors.push(R(c));
          continue;
        }
        let A = a,
          l = 0;
        while (l < s.length) {
          let o = s[l],
            n = l === s.length - 1;
          if (typeof o === "string") A.properties ?? (A.properties = {}), (h = A.properties)[o] ?? (h[o] = {
            errors: []
          }), A = A.properties[o];else A.items ?? (A.items = []), (i = A.items)[o] ?? (i[o] = {
            errors: []
          }), A = A.items[o];
          if (n) A.errors.push(R(c));
          l++;
        }
      }
    };
  return e(T), a;
}
function YvT(T) {
  let R = [],
    a = T.map(e => typeof e === "object" ? e.key : e);
  for (let e of a) if (typeof e === "number") R.push(`[${e}]`);else if (typeof e === "symbol") R.push(`[${JSON.stringify(String(e))}]`);else if (/[^\w$]/.test(e)) R.push(`[${JSON.stringify(e)}]`);else {
    if (R.length) R.push(".");
    R.push(e);
  }
  return R.join("");
}
function QvT(T) {
  let R = [],
    a = [...T.issues].sort((e, t) => (e.path ?? []).length - (t.path ?? []).length);
  for (let e of a) if (R.push(`\u2716 ${e.message}`), e.path?.length) R.push(`  \u2192 at ${YvT(e.path)}`);
  return R.join(`
`);
}
function cjT() {
  return new RegExp(WiR, "u");
}
function sjT(T) {
  return typeof T.precision === "number" ? T.precision === -1 ? "(?:[01]\\d|2[0-3]):[0-5]\\d" : T.precision === 0 ? "(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d" : `(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d\\.\\d{${T.precision}}` : "(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?";
}
function ojT(T) {
  return new RegExp(`^${sjT(T)}$`);
}
function njT(T) {
  let R = sjT({
      precision: T.precision
    }),
    a = ["Z"];
  if (T.local) a.push("");
  if (T.offset) a.push("([+-](?:[01]\\d|2[0-3]):[0-5]\\d)");
  let e = `${R}(?:${a.join("|")})`;
  return new RegExp(`^${fjT}T(?:${e})$`);
}
function Hf(T, R) {
  return new RegExp(`^[A-Za-z0-9+/]{${T}}${R}$`);
}
function Wf(T) {
  return new RegExp(`^[A-Za-z0-9_-]{${T}}$`);
}
function whT(T, R, a) {
  if (T.issues.length) R.issues.push(...cc(a, T.issues));
}
class QJ {
  constructor(T = []) {
    if (this.content = [], this.indent = 0, this) this.args = T;
  }
  indented(T) {
    this.indent += 1, T(this), this.indent -= 1;
  }
  write(T) {
    if (typeof T === "function") {
      T(this, {
        execution: "sync"
      }), T(this, {
        execution: "async"
      });
      return;
    }
    let R = T.split(`
`).filter(t => t),
      a = Math.min(...R.map(t => t.length - t.trimStart().length)),
      e = R.map(t => t.slice(a)).map(t => " ".repeat(this.indent * 2) + t);
    for (let t of e) this.content.push(t);
  }
  compile() {
    let T = Function,
      R = this?.args,
      a = [...(this?.content ?? [""]).map(e => `  ${e}`)];
    return new T(...R, a.join(`
`));
  }
}
function JJ(T) {
  if (T === "") return !0;
  if (T.length % 4 !== 0) return !1;
  try {
    return atob(T), !0;
  } catch {
    return !1;
  }
}
function WjT(T) {
  if (!YB.test(T)) return !1;
  let R = T.replace(/[-_]/g, e => e === "-" ? "+" : "/"),
    a = R.padEnd(Math.ceil(R.length / 4) * 4, "=");
  return JJ(a);
}
function qjT(T, R = null) {
  try {
    let a = T.split(".");
    if (a.length !== 3) return !1;
    let [e] = a;
    if (!e) return !1;
    let t = JSON.parse(atob(e));
    if ("typ" in t && t?.typ !== "JWT") return !1;
    if (!t.alg) return !1;
    if (R && (!("alg" in t) || t.alg !== R)) return !1;
    return !0;
  } catch {
    return !1;
  }
}
function BhT(T, R, a) {
  if (T.issues.length) R.issues.push(...cc(a, T.issues));
  R.value[a] = T.value;
}
function sD(T, R, a, e, t) {
  if (T.issues.length) {
    if (t && !(a in e)) return;
    R.issues.push(...cc(a, T.issues));
  }
  if (T.value === void 0) {
    if (a in e) R.value[a] = void 0;
  } else R.value[a] = T.value;
}
function NhT(T) {
  let R = Object.keys(T.shape);
  for (let e of R) if (!T.shape?.[e]?._zod?.traits?.has("$ZodType")) throw Error(`Invalid element at key "${e}": expected a Zod schema`);
  let a = FvT(T.shape);
  return {
    ...T,
    keys: R,
    keySet: new Set(R),
    numKeys: R.length,
    optionalKeys: new Set(a)
  };
}
function UhT(T, R, a, e, t, r) {
  let h = [],
    i = t.keySet,
    c = t.catchall._zod,
    s = c.def.type,
    A = c.optout === "optional";
  for (let l in R) {
    if (i.has(l)) continue;
    if (s === "never") {
      h.push(l);
      continue;
    }
    let o = c.run({
      value: R[l],
      issues: []
    }, e);
    if (o instanceof Promise) T.push(o.then(n => sD(n, a, l, R, A)));else sD(o, a, l, R, A);
  }
  if (h.length) a.issues.push({
    code: "unrecognized_keys",
    keys: h,
    input: R,
    inst: r
  });
  if (!T.length) return a;
  return Promise.all(T).then(() => {
    return a;
  });
}
function HhT(T, R, a, e) {
  for (let r of T) if (r.issues.length === 0) return R.value = r.value, R;
  let t = T.filter(r => !z_(r));
  if (t.length === 1) return R.value = t[0].value, t[0];
  return R.issues.push({
    code: "invalid_union",
    input: R.value,
    inst: a,
    errors: T.map(r => r.issues.map(h => bi(h, e, st())))
  }), R;
}
function WhT(T, R, a, e) {
  let t = T.filter(r => r.issues.length === 0);
  if (t.length === 1) return R.value = t[0].value, R;
  if (t.length === 0) R.issues.push({
    code: "invalid_union",
    input: R.value,
    inst: a,
    errors: T.map(r => r.issues.map(h => bi(h, e, st())))
  });else R.issues.push({
    code: "invalid_union",
    input: R.value,
    inst: a,
    errors: [],
    inclusive: !1
  });
  return R;
}
function A2(T, R) {
  if (T === R) return {
    valid: !0,
    data: T
  };
  if (T instanceof Date && R instanceof Date && +T === +R) return {
    valid: !0,
    data: T
  };
  if (jb(T) && jb(R)) {
    let a = Object.keys(R),
      e = Object.keys(T).filter(r => a.indexOf(r) !== -1),
      t = {
        ...T,
        ...R
      };
    for (let r of e) {
      let h = A2(T[r], R[r]);
      if (!h.valid) return {
        valid: !1,
        mergeErrorPath: [r, ...h.mergeErrorPath]
      };
      t[r] = h.data;
    }
    return {
      valid: !0,
      data: t
    };
  }
  if (Array.isArray(T) && Array.isArray(R)) {
    if (T.length !== R.length) return {
      valid: !1,
      mergeErrorPath: []
    };
    let a = [];
    for (let e = 0; e < T.length; e++) {
      let t = T[e],
        r = R[e],
        h = A2(t, r);
      if (!h.valid) return {
        valid: !1,
        mergeErrorPath: [e, ...h.mergeErrorPath]
      };
      a.push(h.data);
    }
    return {
      valid: !0,
      data: a
    };
  }
  return {
    valid: !1,
    mergeErrorPath: []
  };
}
function qhT(T, R, a) {
  let e = new Map(),
    t;
  for (let i of R.issues) if (i.code === "unrecognized_keys") {
    t ?? (t = i);
    for (let c of i.keys) {
      if (!e.has(c)) e.set(c, {});
      e.get(c).l = !0;
    }
  } else T.issues.push(i);
  for (let i of a.issues) if (i.code === "unrecognized_keys") for (let c of i.keys) {
    if (!e.has(c)) e.set(c, {});
    e.get(c).r = !0;
  } else T.issues.push(i);
  let r = [...e].filter(([, i]) => i.l && i.r).map(([i]) => i);
  if (r.length && t) T.issues.push({
    ...t,
    keys: r
  });
  if (z_(T)) return T;
  let h = A2(R.value, a.value);
  if (!h.valid) throw Error(`Unmergable intersection. Error path: ${JSON.stringify(h.mergeErrorPath)}`);
  return T.value = h.data, T;
}
function nE(T, R, a) {
  if (T.issues.length) R.issues.push(...cc(a, T.issues));
  R.value[a] = T.value;
}
function zhT(T, R, a, e, t, r, h) {
  if (T.issues.length) if (Gv.has(typeof e)) a.issues.push(...cc(e, T.issues));else a.issues.push({
    code: "invalid_key",
    origin: "map",
    input: t,
    inst: r,
    issues: T.issues.map(i => bi(i, h, st()))
  });
  if (R.issues.length) if (Gv.has(typeof e)) a.issues.push(...cc(e, R.issues));else a.issues.push({
    origin: "map",
    code: "invalid_element",
    input: t,
    inst: r,
    key: e,
    issues: R.issues.map(i => bi(i, h, st()))
  });
  a.value.set(T.value, R.value);
}
function FhT(T, R) {
  if (T.issues.length) R.issues.push(...T.issues);
  R.value.add(T.value);
}
function GhT(T, R) {
  if (T.issues.length && R === void 0) return {
    issues: [],
    value: void 0
  };
  return T;
}
function KhT(T, R) {
  if (T.value === void 0) T.value = R.defaultValue;
  return T;
}
function VhT(T, R) {
  if (!T.issues.length && T.value === void 0) T.issues.push({
    code: "invalid_type",
    expected: "nonoptional",
    input: T.value,
    inst: R
  });
  return T;
}
function lE(T, R, a) {
  if (T.issues.length) return T.aborted = !0, T;
  return R._zod.run({
    value: T.value,
    issues: T.issues
  }, a);
}
function AE(T, R, a) {
  if (T.issues.length) return T.aborted = !0, T;
  if ((a.direction || "forward") === "forward") {
    let e = R.transform(T.value, T);
    if (e instanceof Promise) return e.then(t => pE(T, t, R.out, a));
    return pE(T, e, R.out, a);
  } else {
    let e = R.reverseTransform(T.value, T);
    if (e instanceof Promise) return e.then(t => pE(T, t, R.in, a));
    return pE(T, e, R.in, a);
  }
}
function pE(T, R, a, e) {
  if (T.issues.length) return T.aborted = !0, T;
  return a._zod.run({
    value: R,
    issues: T.issues
  }, e);
}
function XhT(T) {
  return T.value = Object.freeze(T.value), T;
}
function YhT(T, R, a, e) {
  if (!T) {
    let t = {
      code: "custom",
      input: a,
      inst: e,
      path: [...(e._zod.def.path ?? [])],
      continue: !e._zod.def.abort
    };
    if (e._zod.def.params) t.params = e._zod.def.params;
    R.issues.push(rD(t));
  }
}
function qiR() {
  return {
    localeError: ziR()
  };
}
function GiR() {
  return {
    localeError: KiR()
  };
}
function QhT(T, R, a, e) {
  let t = Math.abs(T),
    r = t % 10,
    h = t % 100;
  if (h >= 11 && h <= 19) return e;
  if (r === 1) return R;
  if (r >= 2 && r <= 4) return a;
  return e;
}
function XiR() {
  return {
    localeError: YiR()
  };
}
function ZiR() {
  return {
    localeError: JiR()
  };
}
function RcR() {
  return {
    localeError: acR()
  };
}
function tcR() {
  return {
    localeError: rcR()
  };
}
function icR() {
  return {
    localeError: ccR()
  };
}
function ocR() {
  return {
    localeError: ncR()
  };
}
function FjT() {
  return {
    localeError: AcR()
  };
}
function pcR() {
  return {
    localeError: _cR()
  };
}
function mcR() {
  return {
    localeError: ucR()
  };
}
function PcR() {
  return {
    localeError: kcR()
  };
}
function fcR() {
  return {
    localeError: IcR()
  };
}
function $cR() {
  return {
    localeError: vcR()
  };
}
function ScR() {
  return {
    localeError: OcR()
  };
}
function EcR() {
  return {
    localeError: CcR()
  };
}
function McR() {
  return {
    localeError: DcR()
  };
}
function ZhT(T, R, a) {
  return Math.abs(T) === 1 ? R : a;
}
function uu(T) {
  if (!T) return "";
  let R = ["\u0561", "\u0565", "\u0568", "\u056B", "\u0578", "\u0578\u0582", "\u0585"],
    a = T[T.length - 1];
  return T + (R.includes(a) ? "\u0576" : "\u0568");
}
function BcR() {
  return {
    localeError: NcR()
  };
}
function HcR() {
  return {
    localeError: WcR()
  };
}
function zcR() {
  return {
    localeError: FcR()
  };
}
function KcR() {
  return {
    localeError: VcR()
  };
}
function YcR() {
  return {
    localeError: QcR()
  };
}
function JcR() {
  return {
    localeError: TsR()
  };
}
function KjT() {
  return {
    localeError: asR()
  };
}
function esR() {
  return KjT();
}
function rsR() {
  return {
    localeError: hsR()
  };
}
function JhT(T) {
  let R = Math.abs(T),
    a = R % 10,
    e = R % 100;
  if (e >= 11 && e <= 19 || a === 0) return "many";
  if (a === 1) return "one";
  return "few";
}
function csR() {
  return {
    localeError: ssR()
  };
}
function nsR() {
  return {
    localeError: lsR()
  };
}
function psR() {
  return {
    localeError: _sR()
  };
}
function msR() {
  return {
    localeError: usR()
  };
}
function PsR() {
  return {
    localeError: ksR()
  };
}
function fsR() {
  return {
    localeError: IsR()
  };
}
function $sR() {
  return {
    localeError: vsR()
  };
}
function SsR() {
  return {
    localeError: OsR()
  };
}
function EsR() {
  return {
    localeError: CsR()
  };
}
function TiT(T, R, a, e) {
  let t = Math.abs(T),
    r = t % 10,
    h = t % 100;
  if (h >= 11 && h <= 19) return e;
  if (r === 1) return R;
  if (r >= 2 && r <= 4) return a;
  return e;
}
function MsR() {
  return {
    localeError: DsR()
  };
}
function BsR() {
  return {
    localeError: NsR()
  };
}
function HsR() {
  return {
    localeError: WsR()
  };
}
function zsR() {
  return {
    localeError: FsR()
  };
}
function KsR() {
  return {
    localeError: VsR()
  };
}
function YsR() {
  return {
    localeError: QsR()
  };
}
function XjT() {
  return {
    localeError: JsR()
  };
}
function ToR() {
  return XjT();
}
function aoR() {
  return {
    localeError: eoR()
  };
}
function roR() {
  return {
    localeError: hoR()
  };
}
function coR() {
  return {
    localeError: soR()
  };
}
function noR() {
  return {
    localeError: loR()
  };
}
function poR() {
  return {
    localeError: _oR()
  };
}
function moR() {
  return {
    localeError: uoR()
  };
}
class oRT {
  constructor() {
    this._map = new WeakMap(), this._idmap = new Map();
  }
  add(T, ...R) {
    let a = R[0];
    if (this._map.set(T, a), a && typeof a === "object" && "id" in a) this._idmap.set(a.id, T);
    return this;
  }
  clear() {
    return this._map = new WeakMap(), this._idmap = new Map(), this;
  }
  remove(T) {
    let R = this._map.get(T);
    if (R && typeof R === "object" && "id" in R) this._idmap.delete(R.id);
    return this._map.delete(T), this;
  }
  get(T) {
    let R = T._zod.parent;
    if (R) {
      let a = {
        ...(this.get(R) ?? {})
      };
      delete a.id;
      let e = {
        ...a,
        ...this._map.get(T)
      };
      return Object.keys(e).length ? e : void 0;
    }
    return this._map.get(T);
  }
  has(T) {
    return this._map.has(T);
  }
}
function nRT() {
  return new oRT();
}
function QjT(T, R) {
  return new T({
    type: "string",
    ...a0(R)
  });
}
function ZjT(T, R) {
  return new T({
    type: "string",
    coerce: !0,
    ...a0(R)
  });
}
function pRT(T, R) {
  return new T({
    type: "string",
    format: "email",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function pD(T, R) {
  return new T({
    type: "string",
    format: "guid",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function _RT(T, R) {
  return new T({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function bRT(T, R) {
  return new T({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    version: "v4",
    ...a0(R)
  });
}
function mRT(T, R) {
  return new T({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    version: "v6",
    ...a0(R)
  });
}
function uRT(T, R) {
  return new T({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    version: "v7",
    ...a0(R)
  });
}
function a6(T, R) {
  return new T({
    type: "string",
    format: "url",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function yRT(T, R) {
  return new T({
    type: "string",
    format: "emoji",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function PRT(T, R) {
  return new T({
    type: "string",
    format: "nanoid",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function kRT(T, R) {
  return new T({
    type: "string",
    format: "cuid",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function xRT(T, R) {
  return new T({
    type: "string",
    format: "cuid2",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function fRT(T, R) {
  return new T({
    type: "string",
    format: "ulid",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function IRT(T, R) {
  return new T({
    type: "string",
    format: "xid",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function gRT(T, R) {
  return new T({
    type: "string",
    format: "ksuid",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function $RT(T, R) {
  return new T({
    type: "string",
    format: "ipv4",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function vRT(T, R) {
  return new T({
    type: "string",
    format: "ipv6",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function JjT(T, R) {
  return new T({
    type: "string",
    format: "mac",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function jRT(T, R) {
  return new T({
    type: "string",
    format: "cidrv4",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function SRT(T, R) {
  return new T({
    type: "string",
    format: "cidrv6",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function ORT(T, R) {
  return new T({
    type: "string",
    format: "base64",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function dRT(T, R) {
  return new T({
    type: "string",
    format: "base64url",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function ERT(T, R) {
  return new T({
    type: "string",
    format: "e164",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function CRT(T, R) {
  return new T({
    type: "string",
    format: "jwt",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function TST(T, R) {
  return new T({
    type: "string",
    format: "datetime",
    check: "string_format",
    offset: !1,
    local: !1,
    precision: null,
    ...a0(R)
  });
}
function RST(T, R) {
  return new T({
    type: "string",
    format: "date",
    check: "string_format",
    ...a0(R)
  });
}
function aST(T, R) {
  return new T({
    type: "string",
    format: "time",
    check: "string_format",
    precision: null,
    ...a0(R)
  });
}
function eST(T, R) {
  return new T({
    type: "string",
    format: "duration",
    check: "string_format",
    ...a0(R)
  });
}
function tST(T, R) {
  return new T({
    type: "number",
    checks: [],
    ...a0(R)
  });
}
function rST(T, R) {
  return new T({
    type: "number",
    coerce: !0,
    checks: [],
    ...a0(R)
  });
}
function hST(T, R) {
  return new T({
    type: "number",
    check: "number_format",
    abort: !1,
    format: "safeint",
    ...a0(R)
  });
}
function iST(T, R) {
  return new T({
    type: "number",
    check: "number_format",
    abort: !1,
    format: "float32",
    ...a0(R)
  });
}
function cST(T, R) {
  return new T({
    type: "number",
    check: "number_format",
    abort: !1,
    format: "float64",
    ...a0(R)
  });
}
function sST(T, R) {
  return new T({
    type: "number",
    check: "number_format",
    abort: !1,
    format: "int32",
    ...a0(R)
  });
}
function oST(T, R) {
  return new T({
    type: "number",
    check: "number_format",
    abort: !1,
    format: "uint32",
    ...a0(R)
  });
}
function nST(T, R) {
  return new T({
    type: "boolean",
    ...a0(R)
  });
}
function lST(T, R) {
  return new T({
    type: "boolean",
    coerce: !0,
    ...a0(R)
  });
}
function AST(T, R) {
  return new T({
    type: "bigint",
    ...a0(R)
  });
}
function pST(T, R) {
  return new T({
    type: "bigint",
    coerce: !0,
    ...a0(R)
  });
}
function _ST(T, R) {
  return new T({
    type: "bigint",
    check: "bigint_format",
    abort: !1,
    format: "int64",
    ...a0(R)
  });
}
function bST(T, R) {
  return new T({
    type: "bigint",
    check: "bigint_format",
    abort: !1,
    format: "uint64",
    ...a0(R)
  });
}
function mST(T, R) {
  return new T({
    type: "symbol",
    ...a0(R)
  });
}
function uST(T, R) {
  return new T({
    type: "undefined",
    ...a0(R)
  });
}
function yST(T, R) {
  return new T({
    type: "null",
    ...a0(R)
  });
}
function PST(T) {
  return new T({
    type: "any"
  });
}
function kST(T) {
  return new T({
    type: "unknown"
  });
}
function xST(T, R) {
  return new T({
    type: "never",
    ...a0(R)
  });
}
function fST(T, R) {
  return new T({
    type: "void",
    ...a0(R)
  });
}
function IST(T, R) {
  return new T({
    type: "date",
    ...a0(R)
  });
}
function gST(T, R) {
  return new T({
    type: "date",
    coerce: !0,
    ...a0(R)
  });
}
function $ST(T, R) {
  return new T({
    type: "nan",
    ...a0(R)
  });
}
function zl(T, R) {
  return new QB({
    check: "less_than",
    ...a0(R),
    value: T,
    inclusive: !1
  });
}
function ei(T, R) {
  return new QB({
    check: "less_than",
    ...a0(R),
    value: T,
    inclusive: !0
  });
}
function Fl(T, R) {
  return new ZB({
    check: "greater_than",
    ...a0(R),
    value: T,
    inclusive: !1
  });
}
function br(T, R) {
  return new ZB({
    check: "greater_than",
    ...a0(R),
    value: T,
    inclusive: !0
  });
}
function LRT(T) {
  return Fl(0, T);
}
function MRT(T) {
  return zl(0, T);
}
function DRT(T) {
  return ei(0, T);
}
function wRT(T) {
  return br(0, T);
}
function mP(T, R) {
  return new EJ({
    check: "multiple_of",
    ...a0(R),
    value: T
  });
}
function uP(T, R) {
  return new MJ({
    check: "max_size",
    ...a0(R),
    maximum: T
  });
}
function El(T, R) {
  return new DJ({
    check: "min_size",
    ...a0(R),
    minimum: T
  });
}
function Kv(T, R) {
  return new wJ({
    check: "size_equals",
    ...a0(R),
    size: T
  });
}
function Vv(T, R) {
  return new BJ({
    check: "max_length",
    ...a0(R),
    maximum: T
  });
}
function F_(T, R) {
  return new NJ({
    check: "min_length",
    ...a0(R),
    minimum: T
  });
}
function Xv(T, R) {
  return new UJ({
    check: "length_equals",
    ...a0(R),
    length: T
  });
}
function e6(T, R) {
  return new HJ({
    check: "string_format",
    format: "regex",
    ...a0(R),
    pattern: T
  });
}
function t6(T) {
  return new WJ({
    check: "string_format",
    format: "lowercase",
    ...a0(T)
  });
}
function r6(T) {
  return new qJ({
    check: "string_format",
    format: "uppercase",
    ...a0(T)
  });
}
function h6(T, R) {
  return new zJ({
    check: "string_format",
    format: "includes",
    ...a0(R),
    includes: T
  });
}
function i6(T, R) {
  return new FJ({
    check: "string_format",
    format: "starts_with",
    ...a0(R),
    prefix: T
  });
}
function c6(T, R) {
  return new GJ({
    check: "string_format",
    format: "ends_with",
    ...a0(R),
    suffix: T
  });
}
function BRT(T, R, a) {
  return new KJ({
    check: "property",
    property: T,
    schema: R,
    ...a0(a)
  });
}
function s6(T, R) {
  return new VJ({
    check: "mime_type",
    mime: T,
    ...a0(R)
  });
}
function On(T) {
  return new XJ({
    check: "overwrite",
    tx: T
  });
}
function o6(T) {
  return On(R => R.normalize(T));
}
function n6() {
  return On(T => T.trim());
}
function l6() {
  return On(T => T.toLowerCase());
}
function A6() {
  return On(T => T.toUpperCase());
}
function p6() {
  return On(T => qvT(T));
}
function vST(T, R, a) {
  return new T({
    type: "array",
    element: R,
    ...a0(a)
  });
}
function PoR(T, R, a) {
  return new T({
    type: "union",
    options: R,
    ...a0(a)
  });
}
function koR(T, R, a) {
  return new T({
    type: "union",
    options: R,
    inclusive: !1,
    ...a0(a)
  });
}
function xoR(T, R, a, e) {
  return new T({
    type: "union",
    options: a,
    discriminator: R,
    ...a0(e)
  });
}
function foR(T, R, a) {
  return new T({
    type: "intersection",
    left: R,
    right: a
  });
}
function IoR(T, R, a, e) {
  let t = a instanceof j9;
  return new T({
    type: "tuple",
    items: R,
    rest: t ? a : null,
    ...a0(t ? e : a)
  });
}
function goR(T, R, a, e) {
  return new T({
    type: "record",
    keyType: R,
    valueType: a,
    ...a0(e)
  });
}
function $oR(T, R, a, e) {
  return new T({
    type: "map",
    keyType: R,
    valueType: a,
    ...a0(e)
  });
}
function voR(T, R, a) {
  return new T({
    type: "set",
    valueType: R,
    ...a0(a)
  });
}
function joR(T, R, a) {
  let e = Array.isArray(R) ? Object.fromEntries(R.map(t => [t, t])) : R;
  return new T({
    type: "enum",
    entries: e,
    ...a0(a)
  });
}
function SoR(T, R, a) {
  return new T({
    type: "enum",
    entries: R,
    ...a0(a)
  });
}
function OoR(T, R, a) {
  return new T({
    type: "literal",
    values: Array.isArray(R) ? R : [R],
    ...a0(a)
  });
}
function jST(T, R) {
  return new T({
    type: "file",
    ...a0(R)
  });
}
function doR(T, R) {
  return new T({
    type: "transform",
    transform: R
  });
}
function EoR(T, R) {
  return new T({
    type: "optional",
    innerType: R
  });
}
function CoR(T, R) {
  return new T({
    type: "nullable",
    innerType: R
  });
}
function LoR(T, R, a) {
  return new T({
    type: "default",
    innerType: R,
    get defaultValue() {
      return typeof a === "function" ? a() : zvT(a);
    }
  });
}
function MoR(T, R, a) {
  return new T({
    type: "nonoptional",
    innerType: R,
    ...a0(a)
  });
}
function DoR(T, R) {
  return new T({
    type: "success",
    innerType: R
  });
}
function woR(T, R, a) {
  return new T({
    type: "catch",
    innerType: R,
    catchValue: typeof a === "function" ? a : () => a
  });
}
function BoR(T, R, a) {
  return new T({
    type: "pipe",
    in: R,
    out: a
  });
}
function NoR(T, R) {
  return new T({
    type: "readonly",
    innerType: R
  });
}
function UoR(T, R, a) {
  return new T({
    type: "template_literal",
    parts: R,
    ...a0(a)
  });
}
function HoR(T, R) {
  return new T({
    type: "lazy",
    getter: R
  });
}
function WoR(T, R) {
  return new T({
    type: "promise",
    innerType: R
  });
}
function SST(T, R, a) {
  let e = a0(a);
  return e.abort ?? (e.abort = !0), new T({
    type: "custom",
    check: "custom",
    fn: R,
    ...e
  });
}
function OST(T, R, a) {
  return new T({
    type: "custom",
    check: "custom",
    fn: R,
    ...a0(a)
  });
}
function dST(T) {
  let R = EST(a => {
    return a.addIssue = e => {
      if (typeof e === "string") a.issues.push(rD(e, a.value, R._zod.def));else {
        let t = e;
        if (t.fatal) t.continue = !1;
        t.code ?? (t.code = "custom"), t.input ?? (t.input = a.value), t.inst ?? (t.inst = R), t.continue ?? (t.continue = !R._zod.def.abort), a.issues.push(rD(t));
      }
    }, T(a.value, a);
  });
  return R;
}
function EST(T, R) {
  let a = new $3({
    check: "custom",
    ...a0(R)
  });
  return a._zod.check = T, a;
}
function CST(T) {
  let R = new $3({
    check: "describe"
  });
  return R._zod.onattach = [a => {
    let e = Ph.get(a) ?? {};
    Ph.add(a, {
      ...e,
      description: T
    });
  }], R._zod.check = () => {}, R;
}
function LST(T) {
  let R = new $3({
    check: "meta"
  });
  return R._zod.onattach = [a => {
    let e = Ph.get(a) ?? {};
    Ph.add(a, {
      ...e,
      ...T
    });
  }], R._zod.check = () => {}, R;
}
function MST(T, R) {
  let a = a0(R),
    e = a.truthy ?? ["true", "1", "yes", "on", "y", "enabled"],
    t = a.falsy ?? ["false", "0", "no", "off", "n", "disabled"];
  if (a.case !== "sensitive") e = e.map(o => typeof o === "string" ? o.toLowerCase() : o), t = t.map(o => typeof o === "string" ? o.toLowerCase() : o);
  let r = new Set(e),
    h = new Set(t),
    i = T.Codec ?? T6,
    c = T.Boolean ?? JB,
    s = new (T.String ?? Rk)({
      type: "string",
      error: a.error
    }),
    A = new c({
      type: "boolean",
      error: a.error
    }),
    l = new i({
      type: "pipe",
      in: s,
      out: A,
      transform: (o, n) => {
        let p = o;
        if (a.case !== "sensitive") p = p.toLowerCase();
        if (r.has(p)) return !0;else if (h.has(p)) return !1;else return n.issues.push({
          code: "invalid_value",
          expected: "stringbool",
          values: [...r, ...h],
          input: n.value,
          inst: l,
          continue: !1
        }), {};
      },
      reverseTransform: (o, n) => {
        if (o === !0) return e[0] || "true";else return t[0] || "false";
      },
      error: a.error
    });
  return l;
}
function NS(T, R, a, e = {}) {
  let t = a0(e),
    r = {
      ...a0(e),
      check: "string_format",
      type: "string",
      format: R,
      fn: typeof a === "function" ? a : h => a.test(h),
      ...t
    };
  if (a instanceof RegExp) r.pattern = a;
  return new T(r);
}
function ak(T) {
  let R = T?.target ?? "draft-2020-12";
  if (R === "draft-4") R = "draft-04";
  if (R === "draft-7") R = "draft-07";
  return {
    processors: T.processors ?? {},
    metadataRegistry: T?.metadata ?? Ph,
    target: R,
    unrepresentable: T?.unrepresentable ?? "throw",
    override: T?.override ?? (() => {}),
    io: T?.io ?? "output",
    counter: 0,
    seen: new Map(),
    cycles: T?.cycles ?? "ref",
    reused: T?.reused ?? "inline",
    external: T?.external ?? void 0
  };
}
function T3(T, R, a = {
  path: [],
  schemaPath: []
}) {
  var e;
  let t = T._zod.def,
    r = R.seen.get(T);
  if (r) {
    if (r.count++, a.schemaPath.includes(T)) r.cycle = a.path;
    return r.schema;
  }
  let h = {
    schema: {},
    count: 1,
    cycle: void 0,
    path: a.path
  };
  R.seen.set(T, h);
  let i = T._zod.toJSONSchema?.();
  if (i) h.schema = i;else {
    let s = {
      ...a,
      schemaPath: [...a.schemaPath, T],
      path: a.path
    };
    if (T._zod.processJSONSchema) T._zod.processJSONSchema(R, h.schema, s);else {
      let l = h.schema,
        o = R.processors[t.type];
      if (!o) throw Error(`[toJSONSchema]: Non-representable type encountered: ${t.type}`);
      o(T, R, l, s);
    }
    let A = T._zod.parent;
    if (A) {
      if (!h.ref) h.ref = A;
      T3(A, R, s), R.seen.get(A).isParent = !0;
    }
  }
  let c = R.metadataRegistry.get(T);
  if (c) Object.assign(h.schema, c);
  if (R.io === "input" && kt(T)) delete h.schema.examples, delete h.schema.default;
  if (R.io === "input" && h.schema._prefault) (e = h.schema).default ?? (e.default = h.schema._prefault);
  return delete h.schema._prefault, R.seen.get(T).schema;
}
function ek(T, R) {
  let a = T.seen.get(R);
  if (!a) throw Error("Unprocessed schema. This is a bug in Zod.");
  let e = new Map();
  for (let h of T.seen.entries()) {
    let i = T.metadataRegistry.get(h[0])?.id;
    if (i) {
      let c = e.get(i);
      if (c && c !== h[0]) throw Error(`Duplicate schema id "${i}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
      e.set(i, h[0]);
    }
  }
  let t = h => {
      let i = T.target === "draft-2020-12" ? "$defs" : "definitions";
      if (T.external) {
        let A = T.external.registry.get(h[0])?.id,
          l = T.external.uri ?? (n => n);
        if (A) return {
          ref: l(A)
        };
        let o = h[1].defId ?? h[1].schema.id ?? `schema${T.counter++}`;
        return h[1].defId = o, {
          defId: o,
          ref: `${l("__shared")}#/${i}/${o}`
        };
      }
      if (h[1] === a) return {
        ref: "#"
      };
      let c = `#/${i}/`,
        s = h[1].schema.id ?? `__schema${T.counter++}`;
      return {
        defId: s,
        ref: c + s
      };
    },
    r = h => {
      if (h[1].schema.$ref) return;
      let i = h[1],
        {
          ref: c,
          defId: s
        } = t(h);
      if (i.def = {
        ...i.schema
      }, s) i.defId = s;
      let A = i.schema;
      for (let l in A) delete A[l];
      A.$ref = c;
    };
  if (T.cycles === "throw") for (let h of T.seen.entries()) {
    let i = h[1];
    if (i.cycle) throw Error(`Cycle detected: #/${i.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
  }
  for (let h of T.seen.entries()) {
    let i = h[1];
    if (R === h[0]) {
      r(h);
      continue;
    }
    if (T.external) {
      let c = T.external.registry.get(h[0])?.id;
      if (R !== h[0] && c) {
        r(h);
        continue;
      }
    }
    if (T.metadataRegistry.get(h[0])?.id) {
      r(h);
      continue;
    }
    if (i.cycle) {
      r(h);
      continue;
    }
    if (i.count > 1) {
      if (T.reused === "ref") {
        r(h);
        continue;
      }
    }
  }
}
function tk(T, R) {
  let a = T.seen.get(R);
  if (!a) throw Error("Unprocessed schema. This is a bug in Zod.");
  let e = h => {
    let i = T.seen.get(h);
    if (i.ref === null) return;
    let c = i.def ?? i.schema,
      s = {
        ...c
      },
      A = i.ref;
    if (i.ref = null, A) {
      e(A);
      let o = T.seen.get(A),
        n = o.schema;
      if (n.$ref && (T.target === "draft-07" || T.target === "draft-04" || T.target === "openapi-3.0")) c.allOf = c.allOf ?? [], c.allOf.push(n);else Object.assign(c, n);
      if (Object.assign(c, s), h._zod.parent === A) for (let p in c) {
        if (p === "$ref" || p === "allOf") continue;
        if (!(p in s)) delete c[p];
      }
      if (n.$ref && o.def) for (let p in c) {
        if (p === "$ref" || p === "allOf") continue;
        if (p in o.def && JSON.stringify(c[p]) === JSON.stringify(o.def[p])) delete c[p];
      }
    }
    let l = h._zod.parent;
    if (l && l !== A) {
      e(l);
      let o = T.seen.get(l);
      if (o?.schema.$ref) {
        if (c.$ref = o.schema.$ref, o.def) for (let n in c) {
          if (n === "$ref" || n === "allOf") continue;
          if (n in o.def && JSON.stringify(c[n]) === JSON.stringify(o.def[n])) delete c[n];
        }
      }
    }
    T.override({
      zodSchema: h,
      jsonSchema: c,
      path: i.path ?? []
    });
  };
  for (let h of [...T.seen.entries()].reverse()) e(h[0]);
  let t = {};
  if (T.target === "draft-2020-12") t.$schema = "https://json-schema.org/draft/2020-12/schema";else if (T.target === "draft-07") t.$schema = "http://json-schema.org/draft-07/schema#";else if (T.target === "draft-04") t.$schema = "http://json-schema.org/draft-04/schema#";else if (T.target === "openapi-3.0") ;
  if (T.external?.uri) {
    let h = T.external.registry.get(R)?.id;
    if (!h) throw Error("Schema is missing an `id` property");
    t.$id = T.external.uri(h);
  }
  Object.assign(t, a.def ?? a.schema);
  let r = T.external?.defs ?? {};
  for (let h of T.seen.entries()) {
    let i = h[1];
    if (i.def && i.defId) r[i.defId] = i.def;
  }
  if (T.external) ;else if (Object.keys(r).length > 0) if (T.target === "draft-2020-12") t.$defs = r;else t.definitions = r;
  try {
    let h = JSON.parse(JSON.stringify(t));
    return Object.defineProperty(h, "~standard", {
      value: {
        ...R["~standard"],
        jsonSchema: {
          input: Yv(R, "input", T.processors),
          output: Yv(R, "output", T.processors)
        }
      },
      enumerable: !1,
      writable: !1
    }), h;
  } catch (h) {
    throw Error("Error converting schema to JSON.");
  }
}
function kt(T, R) {
  let a = R ?? {
    seen: new Set()
  };
  if (a.seen.has(T)) return !1;
  a.seen.add(T);
  let e = T._zod.def;
  if (e.type === "transform") return !0;
  if (e.type === "array") return kt(e.element, a);
  if (e.type === "set") return kt(e.valueType, a);
  if (e.type === "lazy") return kt(e.getter(), a);
  if (e.type === "promise" || e.type === "optional" || e.type === "nonoptional" || e.type === "nullable" || e.type === "readonly" || e.type === "default" || e.type === "prefault") return kt(e.innerType, a);
  if (e.type === "intersection") return kt(e.left, a) || kt(e.right, a);
  if (e.type === "record" || e.type === "map") return kt(e.keyType, a) || kt(e.valueType, a);
  if (e.type === "pipe") return kt(e.in, a) || kt(e.out, a);
  if (e.type === "object") {
    for (let t in e.shape) if (kt(e.shape[t], a)) return !0;
    return !1;
  }
  if (e.type === "union") {
    for (let t of e.options) if (kt(t, a)) return !0;
    return !1;
  }
  if (e.type === "tuple") {
    for (let t of e.items) if (kt(t, a)) return !0;
    if (e.rest && kt(e.rest, a)) return !0;
    return !1;
  }
  return !1;
}
function wST(T, R) {
  if ("_idmap" in T) {
    let e = T,
      t = ak({
        ...R,
        processors: _D
      }),
      r = {};
    for (let c of e._idmap.entries()) {
      let [s, A] = c;
      T3(A, t);
    }
    let h = {},
      i = {
        registry: e,
        uri: R?.uri,
        defs: r
      };
    t.external = i;
    for (let c of e._idmap.entries()) {
      let [s, A] = c;
      ek(t, A), h[s] = tk(t, A);
    }
    if (Object.keys(r).length > 0) {
      let c = t.target === "draft-2020-12" ? "$defs" : "definitions";
      h.__shared = {
        [c]: r
      };
    }
    return {
      schemas: h
    };
  }
  let a = ak({
    ...R,
    processors: _D
  });
  return T3(T, a), ek(a, T), tk(a, T);
}
class xOT {
  get metadataRegistry() {
    return this.ctx.metadataRegistry;
  }
  get target() {
    return this.ctx.target;
  }
  get unrepresentable() {
    return this.ctx.unrepresentable;
  }
  get override() {
    return this.ctx.override;
  }
  get io() {
    return this.ctx.io;
  }
  get counter() {
    return this.ctx.counter;
  }
  set counter(T) {
    this.ctx.counter = T;
  }
  get seen() {
    return this.ctx.seen;
  }
  constructor(T) {
    let R = T?.target ?? "draft-2020-12";
    if (R === "draft-4") R = "draft-04";
    if (R === "draft-7") R = "draft-07";
    this.ctx = ak({
      processors: _D,
      target: R,
      ...(T?.metadata && {
        metadata: T.metadata
      }),
      ...(T?.unrepresentable && {
        unrepresentable: T.unrepresentable
      }),
      ...(T?.override && {
        override: T.override
      }),
      ...(T?.io && {
        io: T.io
      })
    });
  }
  process(T, R = {
    path: [],
    schemaPath: []
  }) {
    return T3(T, this.ctx, R);
  }
  emit(T, R) {
    if (R) {
      if (R.cycles) this.ctx.cycles = R.cycles;
      if (R.reused) this.ctx.reused = R.reused;
      if (R.external) this.ctx.external = R.external;
    }
    ek(this.ctx, T);
    let a = tk(this.ctx, T),
      {
        "~standard": e,
        ...t
      } = a;
    return t;
  }
}
function gOT(T) {
  return TST(u6, T);
}
function $OT(T) {
  return RST(y6, T);
}
function vOT(T) {
  return aST(P6, T);
}
function jOT(T) {
  return eST(k6, T);
}
function eR(T) {
  return QjT(_x, T);
}
function COT(T) {
  return pRT(Rj, T);
}
function LOT(T) {
  return pD(yP, T);
}
function MOT(T) {
  return _RT(tc, T);
}
function DOT(T) {
  return bRT(tc, T);
}
function wOT(T) {
  return mRT(tc, T);
}
function BOT(T) {
  return uRT(tc, T);
}
function JRT(T) {
  return a6(rk, T);
}
function NOT(T) {
  return a6(rk, {
    protocol: /^https?$/,
    hostname: cm.domain,
    ...V9.normalizeParams(T)
  });
}
function UOT(T) {
  return yRT(aj, T);
}
function HOT(T) {
  return PRT(ej, T);
}
function WOT(T) {
  return kRT(tj, T);
}
function qOT(T) {
  return xRT(rj, T);
}
function zOT(T) {
  return fRT(hj, T);
}
function FOT(T) {
  return IRT(ij, T);
}
function GOT(T) {
  return gRT(cj, T);
}
function KOT(T) {
  return $RT(sj, T);
}
function VOT(T) {
  return JjT(I6, T);
}
function XOT(T) {
  return vRT(oj, T);
}
function YOT(T) {
  return jRT(nj, T);
}
function QOT(T) {
  return SRT(lj, T);
}
function ZOT(T) {
  return ORT(Aj, T);
}
function JOT(T) {
  return dRT(pj, T);
}
function TdT(T) {
  return ERT(_j, T);
}
function RdT(T) {
  return CRT(bj, T);
}
function adT(T, R, a = {}) {
  return NS(sm, T, R, a);
}
function edT(T) {
  return NS(sm, "hostname", cm.hostname, T);
}
function tdT(T) {
  return NS(sm, "hex", cm.hex, T);
}
function rdT(T, R) {
  let a = R?.enc ?? "hex",
    e = `${T}_${a}`,
    t = cm[e];
  if (!t) throw Error(`Unrecognized hash format: ${e}`);
  return NS(sm, e, t, R);
}
function b8(T) {
  return tST(hk, T);
}
function mD(T) {
  return hST(WA, T);
}
function hdT(T) {
  return iST(WA, T);
}
function idT(T) {
  return cST(WA, T);
}
function cdT(T) {
  return sST(WA, T);
}
function sdT(T) {
  return oST(WA, T);
}
function Q8(T) {
  return nST(bx, T);
}
function odT(T) {
  return AST(ik, T);
}
function ndT(T) {
  return _ST(US, T);
}
function ldT(T) {
  return bST(US, T);
}
function AdT(T) {
  return mST(g6, T);
}
function pdT(T) {
  return uST($6, T);
}
function Qv(T) {
  return yST(v6, T);
}
function T0T() {
  return PST(j6);
}
function h3() {
  return kST(S6);
}
function x6(T) {
  return xST(O6, T);
}
function _dT(T) {
  return fST(d6, T);
}
function bdT(T) {
  return IST(HS, T);
}
function i0(T, R) {
  return vST(E6, T, R);
}
function mdT(T) {
  let R = T._zod.def.shape;
  return Tt(Object.keys(R));
}
function l0(T, R) {
  let a = {
    type: "object",
    shape: T ?? {},
    ...V9.normalizeParams(R)
  };
  return new mx(a);
}
function udT(T, R) {
  return new mx({
    type: "object",
    shape: T,
    catchall: x6(),
    ...V9.normalizeParams(R)
  });
}
function za(T, R) {
  return new mx({
    type: "object",
    shape: T,
    catchall: h3(),
    ...V9.normalizeParams(R)
  });
}
function X8(T, R) {
  return new PP({
    type: "union",
    options: T,
    ...V9.normalizeParams(R)
  });
}
function ydT(T, R) {
  return new C6({
    type: "union",
    options: T,
    inclusive: !1,
    ...V9.normalizeParams(R)
  });
}
function uD(T, R, a) {
  return new L6({
    type: "union",
    options: R,
    discriminator: T,
    ...V9.normalizeParams(a)
  });
}
function Zv(T, R) {
  return new M6({
    type: "intersection",
    left: T,
    right: R
  });
}
function R0T(T, R, a) {
  let e = R instanceof j9,
    t = e ? a : R;
  return new D6({
    type: "tuple",
    items: T,
    rest: e ? R : null,
    ...V9.normalizeParams(t)
  });
}
function _3(T, R, a) {
  return new ux({
    type: "record",
    keyType: T,
    valueType: R,
    ...V9.normalizeParams(a)
  });
}
function PdT(T, R, a) {
  let e = di(T);
  return e._zod.values = void 0, new ux({
    type: "record",
    keyType: e,
    valueType: R,
    ...V9.normalizeParams(a)
  });
}
function kdT(T, R, a) {
  return new ux({
    type: "record",
    keyType: T,
    valueType: R,
    mode: "loose",
    ...V9.normalizeParams(a)
  });
}
function xdT(T, R, a) {
  return new w6({
    type: "map",
    keyType: T,
    valueType: R,
    ...V9.normalizeParams(a)
  });
}
function fdT(T, R) {
  return new B6({
    type: "set",
    valueType: T,
    ...V9.normalizeParams(R)
  });
}
function Tt(T, R) {
  let a = Array.isArray(T) ? Object.fromEntries(T.map(e => [e, e])) : T;
  return new nb({
    type: "enum",
    entries: a,
    ...V9.normalizeParams(R)
  });
}
function IdT(T, R) {
  return new nb({
    type: "enum",
    entries: T,
    ...V9.normalizeParams(R)
  });
}
function H0(T, R) {
  return new N6({
    type: "literal",
    values: Array.isArray(T) ? T : [T],
    ...V9.normalizeParams(R)
  });
}
function gdT(T) {
  return jST(U6, T);
}
function f6(T) {
  return new H6({
    type: "transform",
    transform: T
  });
}
function g3(T) {
  return new mj({
    type: "optional",
    innerType: T
  });
}
function a0T(T) {
  return new W6({
    type: "optional",
    innerType: T
  });
}
function Jv(T) {
  return new q6({
    type: "nullable",
    innerType: T
  });
}
function $dT(T) {
  return g3(Jv(T));
}
function e0T(T, R) {
  return new z6({
    type: "default",
    innerType: T,
    get defaultValue() {
      return typeof R === "function" ? R() : V9.shallowClone(R);
    }
  });
}
function t0T(T, R) {
  return new F6({
    type: "prefault",
    innerType: T,
    get defaultValue() {
      return typeof R === "function" ? R() : V9.shallowClone(R);
    }
  });
}
function r0T(T, R) {
  return new uj({
    type: "nonoptional",
    innerType: T,
    ...V9.normalizeParams(R)
  });
}
function vdT(T) {
  return new G6({
    type: "success",
    innerType: T
  });
}
function h0T(T, R) {
  return new K6({
    type: "catch",
    innerType: T,
    catchValue: typeof R === "function" ? R : () => R
  });
}
function jdT(T) {
  return $ST(V6, T);
}
function Tj(T, R) {
  return new yj({
    type: "pipe",
    in: T,
    out: R
  });
}
function SdT(T, R, a) {
  return new WS({
    type: "pipe",
    in: T,
    out: R,
    transform: a.decode,
    reverseTransform: a.encode
  });
}
function i0T(T) {
  return new X6({
    type: "readonly",
    innerType: T
  });
}
function OdT(T, R) {
  return new Y6({
    type: "template_literal",
    parts: T,
    ...V9.normalizeParams(R)
  });
}
function c0T(T) {
  return new Q6({
    type: "lazy",
    getter: T
  });
}
function ddT(T) {
  return new Z6({
    type: "promise",
    innerType: T
  });
}
function yD(T) {
  return new J6({
    type: "function",
    input: Array.isArray(T?.input) ? R0T(T?.input) : T?.input ?? i0(h3()),
    output: T?.output ?? h3()
  });
}
function EdT(T) {
  let R = new $3({
    check: "custom"
  });
  return R._zod.check = T, R;
}
function s0T(T, R) {
  return SST(yx, T ?? (() => !0), R);
}
function o0T(T, R = {}) {
  return OST(yx, T, R);
}
function n0T(T) {
  return dST(T);
}
function CdT(T, R = {}) {
  let a = new yx({
    type: "custom",
    check: "custom",
    fn: e => e instanceof T,
    abort: !0,
    ...V9.normalizeParams(R)
  });
  return a._zod.bag.Class = T, a._zod.check = e => {
    if (!(e.value instanceof T)) e.issues.push({
      code: "invalid_type",
      expected: T.name,
      input: e.value,
      inst: a,
      path: [...(a._zod.def.path ?? [])]
    });
  }, a;
}
function LdT(T) {
  let R = c0T(() => {
    return X8([eR(T), b8(), Q8(), Qv(), i0(R), _3(eR(), R)]);
  });
  return R;
}
function PD(T, R) {
  return Tj(f6(T), R);
}
function KoR(T) {
  st({
    customError: T
  });
}
function VoR() {
  return st().customError;
}
function YoR(T, R) {
  let a = T.$schema;
  if (a === "https://json-schema.org/draft/2020-12/schema") return "draft-2020-12";
  if (a === "http://json-schema.org/draft-07/schema#") return "draft-7";
  if (a === "http://json-schema.org/draft-04/schema#") return "draft-4";
  return R ?? "draft-2020-12";
}
function QoR(T, R) {
  if (!T.startsWith("#")) throw Error("External $ref is not supported, only local refs (#/...) are allowed");
  let a = T.slice(1).split("/").filter(Boolean);
  if (a.length === 0) return R.rootSchema;
  let e = R.version === "draft-2020-12" ? "$defs" : "definitions";
  if (a[0] === e) {
    let t = a[1];
    if (!t || !R.defs[t]) throw Error(`Reference not found: ${T}`);
    return R.defs[t];
  }
  throw Error(`Reference not found: ${T}`);
}
function DdT(T, R) {
  if (T.not !== void 0) {
    if (typeof T.not === "object" && Object.keys(T.not).length === 0) return p0.never();
    throw Error("not is not supported in Zod (except { not: {} } for never)");
  }
  if (T.unevaluatedItems !== void 0) throw Error("unevaluatedItems is not supported");
  if (T.unevaluatedProperties !== void 0) throw Error("unevaluatedProperties is not supported");
  if (T.if !== void 0 || T.then !== void 0 || T.else !== void 0) throw Error("Conditional schemas (if/then/else) are not supported");
  if (T.dependentSchemas !== void 0 || T.dependentRequired !== void 0) throw Error("dependentSchemas and dependentRequired are not supported");
  if (T.$ref) {
    let t = T.$ref;
    if (R.refs.has(t)) return R.refs.get(t);
    if (R.processing.has(t)) return p0.lazy(() => {
      if (!R.refs.has(t)) throw Error(`Circular reference not resolved: ${t}`);
      return R.refs.get(t);
    });
    R.processing.add(t);
    let r = QoR(t, R),
      h = at(r, R);
    return R.refs.set(t, h), R.processing.delete(t), h;
  }
  if (T.enum !== void 0) {
    let t = T.enum;
    if (R.version === "openapi-3.0" && T.nullable === !0 && t.length === 1 && t[0] === null) return p0.null();
    if (t.length === 0) return p0.never();
    if (t.length === 1) return p0.literal(t[0]);
    if (t.every(h => typeof h === "string")) return p0.enum(t);
    let r = t.map(h => p0.literal(h));
    if (r.length < 2) return r[0];
    return p0.union([r[0], r[1], ...r.slice(2)]);
  }
  if (T.const !== void 0) return p0.literal(T.const);
  let a = T.type;
  if (Array.isArray(a)) {
    let t = a.map(r => {
      let h = {
        ...T,
        type: r
      };
      return DdT(h, R);
    });
    if (t.length === 0) return p0.never();
    if (t.length === 1) return t[0];
    return p0.union(t);
  }
  if (!a) return p0.any();
  let e;
  switch (a) {
    case "string":
      {
        let t = p0.string();
        if (T.format) {
          let r = T.format;
          if (r === "email") t = t.check(p0.email());else if (r === "uri" || r === "uri-reference") t = t.check(p0.url());else if (r === "uuid" || r === "guid") t = t.check(p0.uuid());else if (r === "date-time") t = t.check(p0.iso.datetime());else if (r === "date") t = t.check(p0.iso.date());else if (r === "time") t = t.check(p0.iso.time());else if (r === "duration") t = t.check(p0.iso.duration());else if (r === "ipv4") t = t.check(p0.ipv4());else if (r === "ipv6") t = t.check(p0.ipv6());else if (r === "mac") t = t.check(p0.mac());else if (r === "cidr") t = t.check(p0.cidrv4());else if (r === "cidr-v6") t = t.check(p0.cidrv6());else if (r === "base64") t = t.check(p0.base64());else if (r === "base64url") t = t.check(p0.base64url());else if (r === "e164") t = t.check(p0.e164());else if (r === "jwt") t = t.check(p0.jwt());else if (r === "emoji") t = t.check(p0.emoji());else if (r === "nanoid") t = t.check(p0.nanoid());else if (r === "cuid") t = t.check(p0.cuid());else if (r === "cuid2") t = t.check(p0.cuid2());else if (r === "ulid") t = t.check(p0.ulid());else if (r === "xid") t = t.check(p0.xid());else if (r === "ksuid") t = t.check(p0.ksuid());
        }
        if (typeof T.minLength === "number") t = t.min(T.minLength);
        if (typeof T.maxLength === "number") t = t.max(T.maxLength);
        if (T.pattern) t = t.regex(new RegExp(T.pattern));
        e = t;
        break;
      }
    case "number":
    case "integer":
      {
        let t = a === "integer" ? p0.number().int() : p0.number();
        if (typeof T.minimum === "number") t = t.min(T.minimum);
        if (typeof T.maximum === "number") t = t.max(T.maximum);
        if (typeof T.exclusiveMinimum === "number") t = t.gt(T.exclusiveMinimum);else if (T.exclusiveMinimum === !0 && typeof T.minimum === "number") t = t.gt(T.minimum);
        if (typeof T.exclusiveMaximum === "number") t = t.lt(T.exclusiveMaximum);else if (T.exclusiveMaximum === !0 && typeof T.maximum === "number") t = t.lt(T.maximum);
        if (typeof T.multipleOf === "number") t = t.multipleOf(T.multipleOf);
        e = t;
        break;
      }
    case "boolean":
      {
        e = p0.boolean();
        break;
      }
    case "null":
      {
        e = p0.null();
        break;
      }
    case "object":
      {
        let t = {},
          r = T.properties || {},
          h = new Set(T.required || []);
        for (let [c, s] of Object.entries(r)) {
          let A = at(s, R);
          t[c] = h.has(c) ? A : A.optional();
        }
        if (T.propertyNames) {
          let c = at(T.propertyNames, R),
            s = T.additionalProperties && typeof T.additionalProperties === "object" ? at(T.additionalProperties, R) : p0.any();
          if (Object.keys(t).length === 0) {
            e = p0.record(c, s);
            break;
          }
          let A = p0.object(t).passthrough(),
            l = p0.looseRecord(c, s);
          e = p0.intersection(A, l);
          break;
        }
        if (T.patternProperties) {
          let c = T.patternProperties,
            s = Object.keys(c),
            A = [];
          for (let o of s) {
            let n = at(c[o], R),
              p = p0.string().regex(new RegExp(o));
            A.push(p0.looseRecord(p, n));
          }
          let l = [];
          if (Object.keys(t).length > 0) l.push(p0.object(t).passthrough());
          if (l.push(...A), l.length === 0) e = p0.object({}).passthrough();else if (l.length === 1) e = l[0];else {
            let o = p0.intersection(l[0], l[1]);
            for (let n = 2; n < l.length; n++) o = p0.intersection(o, l[n]);
            e = o;
          }
          break;
        }
        let i = p0.object(t);
        if (T.additionalProperties === !1) e = i.strict();else if (typeof T.additionalProperties === "object") e = i.catchall(at(T.additionalProperties, R));else e = i.passthrough();
        break;
      }
    case "array":
      {
        let {
          prefixItems: t,
          items: r
        } = T;
        if (t && Array.isArray(t)) {
          let h = t.map(c => at(c, R)),
            i = r && typeof r === "object" && !Array.isArray(r) ? at(r, R) : void 0;
          if (i) e = p0.tuple(h).rest(i);else e = p0.tuple(h);
          if (typeof T.minItems === "number") e = e.check(p0.minLength(T.minItems));
          if (typeof T.maxItems === "number") e = e.check(p0.maxLength(T.maxItems));
        } else if (Array.isArray(r)) {
          let h = r.map(c => at(c, R)),
            i = T.additionalItems && typeof T.additionalItems === "object" ? at(T.additionalItems, R) : void 0;
          if (i) e = p0.tuple(h).rest(i);else e = p0.tuple(h);
          if (typeof T.minItems === "number") e = e.check(p0.minLength(T.minItems));
          if (typeof T.maxItems === "number") e = e.check(p0.maxLength(T.maxItems));
        } else if (r !== void 0) {
          let h = at(r, R),
            i = p0.array(h);
          if (typeof T.minItems === "number") i = i.min(T.minItems);
          if (typeof T.maxItems === "number") i = i.max(T.maxItems);
          e = i;
        } else e = p0.array(p0.any());
        break;
      }
    default:
      throw Error(`Unsupported type: ${a}`);
  }
  if (T.description) e = e.describe(T.description);
  if (T.default !== void 0) e = e.default(T.default);
  return e;
}
function at(T, R) {
  if (typeof T === "boolean") return T ? p0.any() : p0.never();
  let a = DdT(T, R),
    e = T.type || T.enum !== void 0 || T.const !== void 0;
  if (T.anyOf && Array.isArray(T.anyOf)) {
    let i = T.anyOf.map(s => at(s, R)),
      c = p0.union(i);
    a = e ? p0.intersection(a, c) : c;
  }
  if (T.oneOf && Array.isArray(T.oneOf)) {
    let i = T.oneOf.map(s => at(s, R)),
      c = p0.xor(i);
    a = e ? p0.intersection(a, c) : c;
  }
  if (T.allOf && Array.isArray(T.allOf)) if (T.allOf.length === 0) a = e ? a : p0.any();else {
    let i = e ? a : at(T.allOf[0], R),
      c = e ? 0 : 1;
    for (let s = c; s < T.allOf.length; s++) i = p0.intersection(i, at(T.allOf[s], R));
    a = i;
  }
  if (T.nullable === !0 && R.version === "openapi-3.0") a = p0.nullable(a);
  if (T.readOnly === !0) a = p0.readonly(a);
  let t = {},
    r = ["$id", "id", "$comment", "$anchor", "$vocabulary", "$dynamicRef", "$dynamicAnchor"];
  for (let i of r) if (i in T) t[i] = T[i];
  let h = ["contentEncoding", "contentMediaType", "contentSchema"];
  for (let i of h) if (i in T) t[i] = T[i];
  for (let i of Object.keys(T)) if (!wdT.has(i)) t[i] = T[i];
  if (Object.keys(t).length > 0) R.registry.add(a, t);
  return a;
}
function ZoR(T, R) {
  if (typeof T === "boolean") return T ? p0.any() : p0.never();
  let a = YoR(T, R?.defaultTarget),
    e = T.$defs || T.definitions || {},
    t = {
      version: a,
      defs: e,
      refs: new Map(),
      processing: new Set(),
      rootSchema: T,
      registry: R?.registry ?? Ph
    };
  return at(T, t);
}
function TnR(T) {
  return ZjT(_x, T);
}
function RnR(T) {
  return rST(hk, T);
}
function anR(T) {
  return lST(bx, T);
}
function enR(T) {
  return pST(ik, T);
}
function tnR(T) {
  return gST(HS, T);
}
function hnR() {
  if (typeof process === "object") return "posix";else if (typeof navigator === "object") return navigator.userAgent.indexOf("Windows") >= 0 ? "windows" : "posix";
  return "posix";
}
function eiT(T, R) {
  if (!T.scheme && R) throw Error(`[UriError]: Scheme is missing: {scheme: "", authority: "${T.authority}", path: "${T.path}", query: "${T.query}", fragment: "${T.fragment}"}`);
  if (T.scheme && !HdT.test(T.scheme)) throw Error("[UriError]: Scheme contains illegal characters.");
  if (T.path) {
    if (T.authority) {
      if (!WdT.test(T.path)) throw Error('[UriError]: If a URI contains an authority component, then the path component must either be empty or begin with a slash ("/") character');
    } else if (qdT.test(T.path)) throw Error('[UriError]: If a URI does not contain an authority component, then the path cannot begin with two slash characters ("//")');
  }
}
function inR(T, R) {
  if (!T && !R) return "file";
  return T;
}
function cnR(T, R) {
  switch (T) {
    case "https":
    case "http":
    case "file":
      if (!R) R = Rc;else if (R[0] !== Rc) R = Rc + R;
      break;
  }
  return R;
}
class zR {
  static isUri(T) {
    if (T instanceof zR) return !0;
    if (!T) return !1;
    let R = T;
    return typeof R.authority === "string" && typeof R.fragment === "string" && typeof R.path === "string" && typeof R.query === "string" && typeof R.scheme === "string" && typeof R.fsPath === "string" && typeof R.with === "function" && typeof R.toString === "function";
  }
  scheme;
  authority;
  path;
  query;
  fragment;
  platform;
  constructor(T, R, a, e, t, r = !1, h) {
    if (typeof T === "object") this.scheme = T.scheme || t3, this.authority = T.authority || t3, this.path = T.path || t3, this.query = T.query || t3, this.fragment = T.fragment || t3, this.platform = T.platform;else this.scheme = inR(T, r), this.authority = R || t3, this.path = cnR(this.scheme, a || t3), this.query = e || t3, this.fragment = t || t3, this.platform = h, eiT(this, r);
  }
  get fsPath() {
    return NdT(this, !1);
  }
  with(T) {
    if (!T) return this;
    let {
      scheme: R,
      authority: a,
      path: e,
      query: t,
      fragment: r,
      platform: h
    } = T;
    if (R === void 0) R = this.scheme;else if (R === null) R = t3;
    if (a === void 0) a = this.authority;else if (a === null) a = t3;
    if (e === void 0) e = this.path;else if (e === null) e = t3;
    if (t === void 0) t = this.query;else if (t === null) t = t3;
    if (r === void 0) r = this.fragment;else if (r === null) r = t3;
    if (h === void 0) h = this.platform;else if (h === null) h = void 0;
    if (R === this.scheme && a === this.authority && e === this.path && t === this.query && r === this.fragment && h === this.platform) return this;
    return new x_(R, a, e, t, r, !1, h);
  }
  static parse(T, R = !1) {
    let a = zdT.exec(T);
    if (!a) return new x_(t3, t3, t3, t3, t3);
    return new x_(a[2] || t3, _E(a[4] || t3), _E(a[5] || t3), _E(a[7] || t3), _E(a[9] || t3), R);
  }
  static file(T, R = hnR()) {
    let a = t3;
    if (R === "windows") T = T.replace(/\\/g, Rc);
    if (T[0] === Rc && T[1] === Rc) {
      let e = T.indexOf(Rc, 2);
      if (e === -1) a = T.substring(2), T = Rc;else a = T.substring(2, e), T = T.substring(e) || Rc;
    }
    return new x_("file", a, T, t3, t3, !1, R);
  }
  static from(T) {
    let R = new x_(T.scheme, T.authority, T.path, T.query, T.fragment, !0, T.platform);
    return eiT(R, !0), R;
  }
  toString(T = !1) {
    return u2(this, T);
  }
  toJSON() {
    return this;
  }
  static revive(T) {
    if (!T) return T;
    if (T instanceof zR) return T;
    let R = new x_(T),
      a = T;
    return R._formatted = a.external, R._fsPath = a._sep === BdT(R.platform) ? a.fsPath : null, R;
  }
}
function BdT(T) {
  return T === "windows" ? 1 : void 0;
}
function tiT(T, R, a) {
  let e;
  for (let t = 0; t < T.length; t++) {
    let r = T.charCodeAt(t);
    if (r >= 97 && r <= 122 || r >= 65 && r <= 90 || r >= 48 && r <= 57 || r === 45 || r === 46 || r === 95 || r === 126 || R && r === 47 || a && r === 91 || a && r === 93 || a && r === 58) {
      if (e !== void 0) e += T.charAt(t);
    } else {
      if (e === void 0) e = T.substring(0, t);
      let h = b0T[r];
      if (h !== void 0) e += h;else e += encodeURIComponent(T.charAt(t));
    }
  }
  return e !== void 0 ? e : T;
}
function snR(T) {
  let R;
  for (let a = 0; a < T.length; a++) {
    let e = T.charCodeAt(a);
    if (e === 35 || e === 63) {
      if (R === void 0) R = T.substring(0, a);
      R += b0T[e];
    } else if (R !== void 0) R += T[a];
  }
  return R !== void 0 ? R : T;
}
function NdT(T, R) {
  let a;
  if (T.authority && T.path.length > 1 && T.scheme === "file") a = `//${T.authority}${T.path}`;else if (T.path.charCodeAt(0) === 47 && (T.path.charCodeAt(1) >= 65 && T.path.charCodeAt(1) <= 90 || T.path.charCodeAt(1) >= 97 && T.path.charCodeAt(1) <= 122) && T.path.charCodeAt(2) === 58) {
    if (!R) a = T.path[1].toLowerCase() + T.path.substring(2);else a = T.path.substring(1);
  } else a = T.path;
  if (T.platform === "windows") a = a.replace(/\//g, "\\");
  return a;
}
function u2(T, R) {
  let a = !R ? tiT : snR,
    e = "",
    {
      scheme: t,
      authority: r,
      path: h,
      query: i,
      fragment: c
    } = T;
  if (t) e += t, e += ":";
  if (r || t === "file") e += Rc, e += Rc;
  if (r) {
    let s = r.indexOf("@");
    if (s !== -1) {
      let A = r.substring(0, s);
      if (r = r.substring(s + 1), s = A.lastIndexOf(":"), s === -1) e += a(A, !1, !1);else e += a(A.substring(0, s), !1, !1), e += ":", e += a(A.substring(s + 1), !1, !0);
      e += "@";
    }
    if (r = r.toLowerCase(), s = r.lastIndexOf(":"), s === -1) e += a(r, !1, !0);else e += a(r.substring(0, s), !1, !0), e += r.substring(s);
  }
  if (h) {
    if (h.length >= 3 && h.charCodeAt(0) === 47 && h.charCodeAt(2) === 58) {
      let s = h.charCodeAt(1);
      if (s >= 65 && s <= 90) h = `/${String.fromCharCode(s + 32)}:${h.substring(3)}`;
    } else if (h.length >= 2 && h.charCodeAt(1) === 58) {
      let s = h.charCodeAt(0);
      if (s >= 65 && s <= 90) h = `${String.fromCharCode(s + 32)}:${h.substring(2)}`;
    }
    e += a(h, !0, !1);
  }
  if (i) e += "?", e += a(i, !1, !1);
  if (c) e += "#", e += !R ? tiT(c, !1, !1) : c;
  return e;
}
function UdT(T) {
  try {
    return decodeURIComponent(T);
  } catch {
    if (T.length > 3) return T.substring(0, 3) + UdT(T.substring(3));else return T;
  }
}
function _E(T) {
  if (!T.match(y2)) return T;
  return T.replace(y2, R => UdT(R));
}
function Pj(T) {
  return T.scheme === "file";
}
function Ht(T) {
  return zR.parse(T);
}
function d0(T) {
  return nn.parse(T.toString());
}
function I8(T) {
  if (typeof T === "string" || T instanceof URL) return zR.parse(T.toString());
  return T;
}
function onR(T) {
  if (T === "/") return "/";
  if (T === "") return ".";
  let R = T.replace(/\/+$/, "");
  if (!R) return ".";
  let a = R.lastIndexOf("/");
  if (a === -1) return ".";
  if (a === 0) return "/";
  return R.slice(0, a);
}
function qA(T) {
  let R = T.replace(/\/+$/, "");
  if (!R) return "";
  let a = R.lastIndexOf("/");
  return a === -1 ? R : R.slice(a + 1);
}
function xD(...T) {
  if (T.length === 0) return ".";
  let R = "";
  for (let h of T) if (h) if (R) R += "/" + h;else R = h;
  if (!R) return ".";
  let a = R.endsWith("/"),
    e = R.split("/").filter(Boolean),
    t = [];
  for (let h of e) if (h === "..") {
    if (t.length > 0 && t[t.length - 1] !== "..") t.pop();else if (!R.startsWith("/")) t.push("..");
  } else if (h !== ".") t.push(h);
  let r = R.startsWith("/") ? "/" + t.join("/") : t.join("/");
  if (!r) r = R.startsWith("/") ? "/" : ".";
  if (a && r !== "/" && r !== ".") r += "/";
  return r;
}
function nnR(T, R, a = "/", e = "/", t = !0) {
  function r(l, o) {
    return t ? l === o : l.toLowerCase() === o.toLowerCase();
  }
  if (a === "/") T = T.replaceAll(/\/{2,}/g, "/"), R = R.replaceAll(/\/{2,}/g, "/");else T = T.replaceAll(/\\{2,}/g, "\\"), R = R.replaceAll(/\\{2,}/g, "\\");
  if (T !== a && T.endsWith(a)) T = T.slice(0, -1);
  if (R !== a && R.endsWith(a)) R = R.slice(0, -1);
  if (r(T, R)) return "";
  if (!T.startsWith(a) && R.startsWith(a)) return R;
  let h = T === a ? [""] : T.split(a),
    i = R === a ? [""] : R.split(a),
    c = 0;
  while (c < h.length && c < i.length && r(h[c], i[c])) c++;
  let s = h.length - c,
    A = [];
  for (let l = 0; l < s; l++) A.push("..");
  return A.push(...i.slice(c)), A.join(e);
}
function FdT(T) {
  let R = qA(T.replace(/\/+$/, "")),
    a = R.lastIndexOf(".");
  if (a === 0 || a === -1) return "";
  return R.slice(a);
}
function Kt(T) {
  try {
    if (T = I8(T), T.scheme === "file") return T.fsPath;
  } catch {}
  return T.toString();
}
function lnR(T) {
  if (T.startsWith(lb)) return T;
  if (GdT.test(T)) return `${lb}${T.replace(/\\/g, lb)}`;
  return;
}
function AnR(T, ...R) {
  return T = I8(T), T.with({
    path: xD(T.path, ...R)
  });
}
function pnR(T, ...R) {
  let a = T.path,
    e = !1;
  if (a[0] !== lb) a = lb + a, e = !0;
  let t = a;
  for (let r of R) {
    let h = lnR(r);
    if (h) t = xD(h);else t = xD(t, r);
  }
  if (t !== "/" && t.endsWith("/")) t = t.replace(/\/+$/, "");
  if (e && t[0] === lb && !T.authority) t = t.substring(1);
  return T.with({
    path: t
  });
}
function _nR(T) {
  if (T = I8(T), T.path.length === 0 || T.path === lb) return T;
  let R = onR(T.path);
  if (R.length === 1 && R === ".") R = "";
  return T.with({
    path: R
  });
}
function bnR(T, R) {
  if (R.scheme !== T.scheme || (R.authority ?? "") !== (T.authority ?? "")) return !1;
  let a = R.scheme === "file" && R.path.match(/^\/[A-Za-z]:/),
    e = a ? R.path.slice(0, 2).toUpperCase() + R.path.slice(2) : R.path,
    t = a ? T.path.slice(0, 2).toUpperCase() + T.path.slice(2) : T.path;
  return t === e || t.startsWith(e.endsWith("/") ? e : `${e}/`) || e.endsWith("/") && t === e.slice(0, -1);
}
function mnR(T, R) {
  if (T.scheme !== R.scheme || T.authority !== R.authority || T.query !== R.query || T.fragment !== R.fragment) return null;
  let a = T.platform === "windows" ? "\\" : "/";
  return nnR(T.path, R.path, a, a);
}
function unR(T, R) {
  let a = d0(T),
    e = d0(R);
  if (a.startsWith("file:///") && e.startsWith("file:///")) return riT(a) === riT(e);
  return a === e;
}
function riT(T) {
  return T.replace(/^file:\/\/\/([A-Za-z]):/, R => `file:///${R.toLowerCase()}:`);
}
function ynR() {
  return knR;
}
function PnR(T) {
  let R = xl;
  return xl = T, R;
}
function Gy(T) {
  return (R, ...a) => {
    fD[T](R, ...a);
  };
}
class Sb {
  baseLogger;
  scope;
  context = {};
  constructor(T = fD) {
    this.baseLogger = T;
  }
  with(T) {
    let R = new Sb(this.baseLogger);
    return R.scope = this.scope, R.context = {
      ...this.context,
      ...T
    }, R;
  }
  scoped(T) {
    let R = new Sb(this.baseLogger);
    return R.scope = this.scope ? `${this.scope}.${T}` : T, R.context = {
      ...this.context
    }, R;
  }
  error(T, ...R) {
    let a = this.mergeContextWithMeta(R);
    this.baseLogger.error(this.messageWithPrefix(T), ...a);
  }
  warn(T, ...R) {
    let a = this.mergeContextWithMeta(R);
    this.baseLogger.warn(this.messageWithPrefix(T), ...a);
  }
  info(T, ...R) {
    let a = this.mergeContextWithMeta(R);
    this.baseLogger.info(this.messageWithPrefix(T), ...a);
  }
  debug(T, ...R) {
    let a = this.mergeContextWithMeta(R);
    this.baseLogger.debug(this.messageWithPrefix(T), ...a);
  }
  audit(T, ...R) {
    let a = this.mergeContextWithMeta(R);
    this.baseLogger.audit(this.messageWithPrefix(T), ...a);
  }
  messageWithPrefix(T) {
    return this.scope ? `${this.scope}: ${T}` : T;
  }
  mergeContextWithMeta(T) {
    let R = {
        ...this.context
      },
      a = P2.trace.getActiveSpan();
    if (a) {
      let t = a.spanContext();
      if (t.traceId) R.traceId = t.traceId, R.spanId = t.spanId;
    }
    if (T.length === 0) return [R];
    let e = T[0];
    if (typeof e === "object" && e !== null) return [{
      ...e,
      ...R
    }, ...T.slice(1)];else return [R, ...T];
  }
}
function $nR() {
  return !1;
}
function VdT(T) {
  return T.trim().toLowerCase();
}
function vnR(T) {
  if (!T.endsWith("@sourcegraph.com")) return !1;
  if ($nR()) return !0;
  return YdT.has(T);
}
function XdT(T) {
  let R = VdT(T);
  if (R.length === 0) return !1;
  return R.endsWith("@sourcegraph.com") || R.endsWith("@ampcode.com") || R === "auth-bypass-user@example.com";
}
function Ns(T) {
  let R = VdT(T);
  if (R.length === 0) return !1;
  return vnR(R) || R.endsWith("@ampcode.com") || R === "auth-bypass-user@example.com";
}
function o9(T, R, a = R + "s") {
  return T === 1 ? R : a;
}
function u0T(T) {
  return Cg[T] ?? 0;
}
function jnR(T) {
  return typeof T === "number" && Number.isInteger(T) && T >= 1 && T <= 3600;
}
function SnR(T) {
  let R = T.settings["tools.inactivityTimeout"],
    a = T.settings["tools.stopTimeout"],
    e = R;
  if (e === void 0 && a !== void 0) e = a;
  if (e === void 0) e = u0T("amp.tools.inactivityTimeout");
  if (!jnR(e)) return null;
  return e * 1000;
}
function OnR(T) {
  let R = T.settings["tools.stopTimeout"],
    a = u0T("amp.tools.stopTimeout");
  return (R ?? a) * 1000;
}
function k2(T) {
  let R = T.settings["network.timeout"],
    a = u0T("amp.network.timeout");
  return (R ?? a) * 1000;
}
function AL(T) {
  Promise.resolve().then(() => {
    try {
      T();
    } catch (R) {
      console.error(R);
    }
  });
}
function ZdT(T) {
  let R = T._cleanup;
  if (R === void 0) return;
  if (T._cleanup = void 0, !R) return;
  try {
    if (typeof R === "function") R();else if (R && typeof R.unsubscribe === "function") R.unsubscribe();
  } catch (a) {
    console.error("cleanupSubscription", a);
  }
}
function x2(T) {
  T._observer = void 0, T._queue = void 0, T._state = "closed";
}
function dnR(T) {
  let R = T._queue;
  if (!R) return;
  T._queue = void 0, T._state = "ready";
  for (let a of R) if (JdT(T, a.type, a.value), T._state === "closed") break;
}
function JdT(T, R, a) {
  T._state = "running";
  let e = T._observer;
  try {
    switch (R) {
      case "next":
        if (e && typeof e.next === "function") e.next(a);
        break;
      case "error":
        if (x2(T), e && typeof e.error === "function") e.error(a);else throw a;
        break;
      case "complete":
        if (x2(T), e && typeof e.complete === "function") e.complete();
        break;
    }
  } catch (t) {
    console.error("notifySubscription", t);
  }
  if (T._state === "closed") ZdT(T);else if (T._state === "running") T._state = "ready";
}
function MW(T, R, a) {
  if (T._state === "closed") return;
  if (T._state === "buffering") {
    T._queue = T._queue || [], T._queue.push({
      type: R,
      value: a
    });
    return;
  }
  if (T._state !== "ready") {
    T._state = "buffering", T._queue = [{
      type: R,
      value: a
    }], AL(() => dnR(T));
    return;
  }
  JdT(T, R, a);
}
class TET {
  _cleanup;
  _observer;
  _queue;
  _state;
  constructor(T, R) {
    this._cleanup = void 0, this._observer = T, this._queue = void 0, this._state = "initializing";
    let a = new RET(this);
    try {
      this._cleanup = R.call(void 0, a);
    } catch (e) {
      a.error(e);
    }
    if (this._state === "initializing") this._state = "ready";
  }
  get closed() {
    return this._state === "closed";
  }
  unsubscribe() {
    if (this._state !== "closed") x2(this), ZdT(this);
  }
}
class RET {
  _subscription;
  constructor(T) {
    this._subscription = T;
  }
  get closed() {
    return this._subscription._state === "closed";
  }
  next(T) {
    MW(this._subscription, "next", T);
  }
  error(T) {
    MW(this._subscription, "error", T);
  }
  complete() {
    MW(this._subscription, "complete");
  }
}
function U3(T) {
  if (typeof T === "function") T();else if (T && typeof T.unsubscribe === "function") T.unsubscribe();
}
class FS {
  _baseObserver;
  _pendingPromises;
  constructor(T) {
    this._baseObserver = T, this._pendingPromises = new Set();
  }
  complete() {
    Promise.all(this._pendingPromises).then(() => this._baseObserver.complete()).catch(T => this._baseObserver.error(T));
  }
  error(T) {
    this._baseObserver.error(T);
  }
  schedule(T) {
    let R = Promise.all(this._pendingPromises),
      a = [],
      e = r => a.push(r),
      t = Promise.resolve().then(async () => {
        await R, await T(e), this._pendingPromises.delete(t);
        for (let r of a) this._baseObserver.next(r);
      }).catch(r => {
        this._pendingPromises.delete(t), this._baseObserver.error(r);
      });
    this._pendingPromises.add(t);
  }
}
function aET(T) {
  return T && typeof T.subscribe === "function" && typeof T[Symbol.observable] === "function";
}
function eET(T) {
  if (aET(T)) return T;
  return AR.of(T);
}
function f2(T, R) {
  if (T === R) return !0;
  if (T == null || R == null || typeof T !== "object" || typeof R !== "object") return !1;
  let a = Array.isArray(T),
    e = Array.isArray(R);
  if (a !== e) return !1;
  if (a && e) return T.length === R.length && T.every((r, h) => f2(r, R[h]));
  let t = new Set([...Object.keys(T), ...Object.keys(R)]);
  for (let r of t) if (!f2(T[r], R[r])) return !1;
  return !0;
}
async function m0(T, R) {
  return new Promise((a, e) => {
    let t,
      r = () => {
        t?.unsubscribe(), e(new DOMException("Aborted", "AbortError"));
      };
    R?.addEventListener("abort", r, {
      once: !0
    }), t = T.subscribe({
      next: h => {
        t?.unsubscribe(), R?.removeEventListener("abort", r), a(h);
      },
      error: h => {
        R?.removeEventListener("abort", r), e(h);
      },
      complete: () => {
        R?.removeEventListener("abort", r), e("Observable completed without emitting a value");
      }
    });
  });
}
async function eN(T, R) {
  return new Promise((a, e) => {
    let t,
      r = !1,
      h,
      i = () => {
        h?.unsubscribe(), e(new DOMException("Aborted", "AbortError"));
      };
    R?.addEventListener("abort", i, {
      once: !0
    }), h = T.subscribe({
      next: c => {
        t = c, r = !0;
      },
      error: c => {
        R?.removeEventListener("abort", i), e(c);
      },
      complete: () => {
        if (R?.removeEventListener("abort", i), r) a(t);else e("Observable completed without emitting a value");
      }
    });
  });
}
async function LnR(T, R) {
  return new Promise((a, e) => {
    let t = T.subscribe({
      error: e,
      complete: () => a()
    });
    R?.addEventListener("abort", () => {
      t.unsubscribe(), e(new DOMException("Aborted", "AbortError"));
    }, {
      once: !0
    });
  });
}
function gh(T) {
  return new AR(R => {
    T.then(a => {
      R.next(a), R.complete();
    }).catch(a => {
      R.error(a);
    });
  });
}
function Q9(T) {
  return new AR(R => {
    let a = !1,
      e = new AbortController(),
      t = e.signal;
    return (async () => {
      try {
        t?.throwIfAborted();
        let r = await T(t);
        if (t?.throwIfAborted(), !a) R.next(r), R.complete();
      } catch (r) {
        if (!a) if (t.aborted) R.complete();else R.error(r);
      }
    })(), () => {
      a = !0, e.abort();
    };
  });
}
function JR(T) {
  return R => {
    return new AR(a => {
      let e = new FS(a),
        t = 0,
        r = R.subscribe({
          complete() {
            e.complete();
          },
          error(h) {
            e.error(h);
          },
          next(h) {
            e.schedule(async i => {
              let c = await T(h, t);
              t++, i(c);
            });
          }
        });
      return () => U3(r);
    });
  };
}
function hET(T, R = aN) {
  return new AR(a => {
    let e = 0,
      t = null,
      r = () => {
        a.next(e++), t = R.schedule(r, T);
      };
    return t = R.schedule(r, T), () => {
      if (t) t();
    };
  });
}
function xj(...T) {
  return new AR(R => {
    let a = 0,
      e = T.map(t => t.subscribe({
        next: r => R.next(r),
        error: r => R.error(r),
        complete: () => {
          if (a++, a === T.length) R.complete();
        }
      }));
    return () => {
      iET(e);
    };
  });
}
function v3(...T) {
  if (T.length === 0) return P0T;
  return new AR(R => {
    let a = Array(T.length),
      e = Array(T.length).fill(0),
      t = Array(T.length).fill(!1),
      r = 0,
      h = [],
      i = new FS(R);
    for (let c = 0; c < T.length; c++) {
      let s = T[c];
      h.push(s.subscribe({
        next(A) {
          a[c] = A, t[c] = !0;
          let l = ++e[c];
          if (t.every(Boolean)) i.schedule(async o => {
            if (e[c] === l) o([...a]);
          });
        },
        error(A) {
          i.error(A);
        },
        complete() {
          if (r++, r === T.length) i.complete();
        }
      }));
    }
    return () => {
      iET(h);
    };
  });
}
function f3(T) {
  let R = T?.shouldCountRefs ?? !0,
    a = NnR++,
    e = (t, ...r) => {};
  return t => {
    let r = new W0(),
      h = null,
      i = !1,
      c,
      s = 0;
    return new AR(A => {
      if (s++, i) e("new subscriber, emitting buffered value", c), A.next(c);else e("new subscriber, no buffered value to emit");
      if (!h) h = t.subscribe({
        next: o => {
          i = !0, c = o, r.next(o);
        },
        error: o => r.error(o),
        complete: () => r.complete()
      });
      let l = r.subscribe(A);
      return () => {
        if (s--, l.unsubscribe(), R && s === 0) {
          if (h) U3(h), h = null;
          i = !1;
        }
      };
    });
  };
}
function iET(T) {
  for (let R of T) if (R) U3(R);
}
function M$(T) {
  return R => {
    return new AR(a => {
      let e = R.subscribe({
          next: r => a.next(r),
          error: r => a.error(r),
          complete: () => a.complete()
        }),
        t = T.subscribe({
          next: () => {
            a.complete(), e.unsubscribe(), t.unsubscribe();
          },
          error: r => {
            a.error(r), e.unsubscribe();
          }
        });
      return () => {
        e.unsubscribe(), t.unsubscribe();
      };
    });
  };
}
function tN(T) {
  return R => {
    return new AR(a => {
      let e,
        t = R.subscribe({
          next(r) {
            e = r, a.next(r);
          },
          error(r) {
            a.error(r);
          },
          complete() {
            a.complete();
          }
        });
      return () => {
        U3(t), T(e);
      };
    });
  };
}
function E9(T = f2) {
  return R => {
    return new AR(a => {
      let e = g2,
        t = new FS(a),
        r = R.subscribe({
          complete() {
            t.complete();
          },
          error(h) {
            t.error(h);
          },
          next(h) {
            t.schedule(async i => {
              if (e === g2 || !T(e, h)) e = h, i(h);
            });
          }
        });
      return () => U3(r);
    });
  };
}
function cET(T) {
  return MnR(typeof T === "function" ? {
    next: T
  } : T);
}
function MnR(T) {
  return R => new AR(a => {
    let e = typeof T === "function" ? T() : T,
      t = R.subscribe({
        next(r) {
          if (e.next) try {
            e.next(r);
          } catch (h) {
            a.error(h);
            return;
          }
          a.next(r);
        },
        error(r) {
          if (e.error) try {
            e.error(r);
          } catch (h) {
            a.error(h);
            return;
          }
          a.error(r);
        },
        complete() {
          if (e.complete) try {
            e.complete();
          } catch (r) {
            a.error(r);
            return;
          }
          a.complete();
        }
      });
    return () => U3(t);
  });
}
function Gl(T) {
  return R => {
    return new AR(a => {
      let e = !1,
        t = R.subscribe({
          next: h => {
            e = !0, clearTimeout(r), a.next(h);
          },
          error: h => {
            clearTimeout(r), a.error(h);
          },
          complete: () => {
            clearTimeout(r), a.complete();
          }
        }),
        r = setTimeout(() => {
          if (!e) t.unsubscribe(), a.error(new x0T(`Operation timed out after ${T}ms`));
        }, T);
      return () => {
        clearTimeout(r), t.unsubscribe();
      };
    });
  };
}
function Y3(T) {
  return R => new AR(a => {
    let e;
    try {
      a.next(T), e = R.subscribe({
        next(t) {
          a.next(t);
        },
        error(t) {
          a.error(t);
        },
        complete() {
          a.complete();
        }
      });
    } catch (t) {
      a.error(t);
    }
    return () => {
      if (e) U3(e);
    };
  });
}
function ti(T) {
  return R => new AR(a => {
    let e = 0,
      t = R.subscribe({
        next(r) {
          if (e < T) {
            if (a.next(r), e++, e === T) a.complete(), U3(t);
          }
        },
        error(r) {
          a.error(r);
        },
        complete() {
          a.complete();
        }
      });
    return () => {
      U3(t);
    };
  });
}
function DnR(T) {
  return R => new AR(a => {
    let e = 0,
      t = R.subscribe({
        next(r) {
          if (e >= T) a.next(r);else e++;
        },
        error(r) {
          a.error(r);
        },
        complete() {
          a.complete();
        }
      });
    return () => {
      U3(t);
    };
  });
}
function L9(T) {
  return R => {
    return new AR(a => {
      let e = 0,
        t = null,
        r = !1,
        h = () => {
          if (r && !t) a.complete();
        },
        i = R.subscribe({
          next(c) {
            if (t) U3(t), t = null;
            let s;
            try {
              s = T(c, e++);
            } catch (A) {
              a.error(A);
              return;
            }
            t = s.subscribe({
              next(A) {
                a.next(A);
              },
              error(A) {
                a.error(A);
              },
              complete() {
                t = null, h();
              }
            });
          },
          error(c) {
            a.error(c);
          },
          complete() {
            r = !0, h();
          }
        });
      return () => {
        if (U3(i), t) U3(t);
      };
    });
  };
}
function KS(T, R) {
  let a = R?.scheduler ?? aN;
  return e => new AR(t => {
    let r = null,
      h = null,
      i = !1,
      c = e.subscribe({
        next: s => {
          if (h = s, i = !0, r === null) r = a.schedule(() => {
            if (i) t.next(h), i = !1;
            r = null;
          }, T);
        },
        error: s => t.error(s),
        complete: () => {
          if (r !== null) r();
          if (i) t.next(h);
          t.complete();
        }
      });
    return () => {
      if (U3(c), r !== null) r();
    };
  });
}
function wnR(T, R) {
  if (!R.leading || !R.trailing) throw Error("leading and trailing must be true");
  let a = R.scheduler ?? aN;
  return e => new AR(t => {
    let r = 0,
      h = null,
      i = null,
      c = !1,
      s = e.subscribe({
        next: A => {
          let l = a.now();
          if (i = A, c = !0, l - r >= T) t.next(A), r = l, c = !1;else if (h === null) h = a.schedule(() => {
            if (c) t.next(i), r = a.now(), c = !1;
            h = null;
          }, T - (l - r));
          if (r === 0) t.next(A), r = l, c = !1;
        },
        error: A => t.error(A),
        complete: () => {
          if (h !== null) h();
          if (c) t.next(i);
          t.complete();
        }
      });
    return () => {
      if (U3(s), h !== null) h();
    };
  });
}
function sET(...T) {
  return new AR(R => {
    let a = 0,
      e = null;
    function t() {
      if (a >= T.length) {
        R.complete();
        return;
      }
      e = T[a].subscribe({
        next: r => R.next(r),
        error: r => R.error(r),
        complete: () => {
          a++, t();
        }
      });
    }
    return t(), () => {
      if (e) U3(e);
    };
  });
}
function D$(T) {
  return R => new AR(a => {
    let e = 0,
      t = !1,
      r = null,
      h = R.subscribe({
        next(i) {
          try {
            let c = T(i, e++);
            if (r) U3(r);
            r = c.subscribe({
              next(s) {
                a.next(s);
              },
              error(s) {
                a.error(s);
              },
              complete() {
                if (r = null, t && !r) a.complete();
              }
            });
          } catch (c) {
            a.error(c);
          }
        },
        error(i) {
          a.error(i);
        },
        complete() {
          if (t = !0, !r) a.complete();
        }
      });
    return () => {
      if (U3(h), r) U3(r);
    };
  });
}
function mE({
  onSubscribe: T,
  onUnsubscribe: R
}) {
  return a => new AR(e => {
    T?.();
    let t = a.subscribe(e);
    return () => {
      U3(t), R?.();
    };
  });
}
function I2(T) {
  return R => AR.from(R).pipe(L9(a => Q9(e => T(a, e))));
}
function vs(T) {
  return R => new AR(a => {
    let e,
      t = R.subscribe({
        next(r) {
          a.next(r);
        },
        error(r) {
          try {
            e = T(r).subscribe({
              next(h) {
                a.next(h);
              },
              error(h) {
                a.error(h);
              },
              complete() {
                a.complete();
              }
            });
          } catch (h) {
            a.error(h);
          }
        },
        complete() {
          a.complete();
        }
      });
    return () => {
      if (U3(t), e) U3(e);
    };
  });
}
function da(T) {
  return R => {
    return new AR(a => {
      let e = R.subscribe({
        next(t) {
          if (T(t)) a.next(t);
        },
        error(t) {
          a.error(t);
        },
        complete() {
          a.complete();
        }
      });
      return () => U3(e);
    });
  };
}
function BnR(T, R) {
  return a => {
    return new AR(e => {
      let t,
        r = 0,
        h = new FS(e),
        i = a.subscribe({
          complete() {
            h.complete();
          },
          error(c) {
            h.error(c);
          },
          next(c) {
            h.schedule(async s => {
              t = await T(r === 0 ? typeof R > "u" ? c : R : t, c, r++), s(t);
            });
          }
        });
      return () => U3(i);
    });
  };
}
function f0T(T, R) {
  return a => {
    return AR.from(a).pipe(L9(e => e === Jo ? AR.of(Jo) : T(e).pipe(vs(t => AR.of(t instanceof Error ? t : Error(t))), Y3(Jo))), f3(R));
  };
}
function nET() {
  return T => AR.from(T).pipe(da(R => R !== Jo));
}
async function UnR(T, R) {
  let a = await m0(AR.from(T).pipe(nET()), R);
  if (a instanceof Error) throw a;
  return a;
}
function Ob(T) {
  let R = typeof T === "string" ? T : T.toString();
  return R === Lr || R === Lr.slice(0, -1);
}
function ID(T) {
  return Ob(T) ? Lr : T;
}
function znR(T) {
  let R = (typeof T === "string" ? new URL(T) : T).hostname;
  return R === $2.hostname || R === "localhost" || R === biT.slice(1) || R.endsWith(biT);
}
function GnR(T) {
  return v2.safeParse(T);
}
function fj(T) {
  return lET.safeParse(T);
}
function I0T(T) {
  if (!T || !Array.isArray(T)) return [];
  let R = [];
  for (let [a, e] of T.entries()) {
    let t = GnR(e);
    if (t.success) R.push(t.data);else {
      let r = typeof e === "object" && e !== null && "tool" in e ? String(e.tool) : `entry at index ${a}`;
      J.warn(`Permission entry for tool "${r}" is invalid: ${t.error.issues.map(h => `${h.path.join(".")}: ${h.message}`).join(", ")}`);
    }
  }
  return R;
}
function Mr(T, R) {
  let a = KnR(T, R);
  return typeof a === "string" ? a : a.toString();
}
function KnR(T, R, a = !0) {
  if (!R) R = VnR();
  let {
      workspaceFolders: e,
      isWindows: t,
      homeDir: r
    } = R,
    h = typeof T === "string" ? zR.parse(T) : zR.from(T);
  if (e) for (let i of e) {
    let c = I8(i);
    if (MR.hasPrefix(h, c)) {
      let s = c.path.endsWith("/") ? c.path.slice(0, -1) : c.path,
        A = a && e && e.length >= 2 ? qA(c.path) + (t ? "\\" : "/") : "";
      return DW(A + h.path.slice(s.length + 1), t, h.scheme);
    }
  }
  if (h?.scheme === "file") {
    if (r) {
      let i = I8(r);
      if (MR.hasPrefix(h, i)) {
        let c = i.path.endsWith("/") ? i.path.slice(0, -1) : i.path,
          s = h.path.slice(c.length + 1);
        return DW("~" + (t ? "\\" : "/") + s, t, h.scheme);
      }
    }
    return DW(h.fsPath, t, h.scheme);
  }
  return h;
}
function DW(T, R, a) {
  return R && a === "file" ? T.replaceAll("/", "\\") : T;
}
function AET(T) {
  let R = gD;
  return gD = T, R;
}
function VnR() {
  if (gD) return gD;
  throw Error("must call setDisplayPathEnvInfo before calling displayPath() and related functions");
}
function miT() {
  if (Lg > w$.length - 16) XnR(w$), Lg = 0;
  return w$.slice(Lg, Lg += 16);
}
function QnR(T, R = 0) {
  return (ce[T[R + 0]] + ce[T[R + 1]] + ce[T[R + 2]] + ce[T[R + 3]] + "-" + ce[T[R + 4]] + ce[T[R + 5]] + "-" + ce[T[R + 6]] + ce[T[R + 7]] + "-" + ce[T[R + 8]] + ce[T[R + 9]] + "-" + ce[T[R + 10]] + ce[T[R + 11]] + ce[T[R + 12]] + ce[T[R + 13]] + ce[T[R + 14]] + ce[T[R + 15]]).toLowerCase();
}
function JnR(T, R, a) {
  let e;
  if (T) e = uiT(T.random ?? T.rng?.() ?? miT(), T.msecs, T.seq, R, a);else {
    let t = Date.now(),
      r = miT();
    TlR(pL, t, r), e = uiT(r, pL.msecs, pL.seq, R, a);
  }
  return R ?? QnR(e);
}
function TlR(T, R, a) {
  if (T.msecs ??= -1 / 0, T.seq ??= 0, R > T.msecs) T.seq = a[6] << 23 | a[7] << 16 | a[8] << 8 | a[9], T.msecs = R;else if (T.seq = T.seq + 1 | 0, T.seq === 0) T.msecs++;
  return T;
}
function uiT(T, R, a, e, t = 0) {
  if (T.length < 16) throw Error("Random bytes length must be >= 16");
  if (!e) e = new Uint8Array(16), t = 0;else if (t < 0 || t + 16 > e.length) throw RangeError(`UUID byte range ${t}:${t + 15} is out of buffer bounds`);
  return R ??= Date.now(), a ??= T[6] * 127 << 24 | T[7] << 16 | T[8] << 8 | T[9], e[t++] = R / 1099511627776 & 255, e[t++] = R / 4294967296 & 255, e[t++] = R / 16777216 & 255, e[t++] = R / 65536 & 255, e[t++] = R / 256 & 255, e[t++] = R & 255, e[t++] = 112 | a >>> 28 & 15, e[t++] = a >>> 20 & 255, e[t++] = 128 | a >>> 14 & 63, e[t++] = a >>> 6 & 255, e[t++] = a << 2 & 255 | T[10] & 3, e[t++] = T[11], e[t++] = T[12], e[t++] = T[13], e[t++] = T[14], e[t++] = T[15], e;
}
function alR(T) {
  let R = 0,
    a = [];
  while (R < T.length) {
    let e = T[R];
    if (e === "\\") {
      R++;
      continue;
    }
    if (e === "{") {
      a.push({
        type: "brace",
        value: "{"
      }), R++;
      continue;
    }
    if (e === "}") {
      a.push({
        type: "brace",
        value: "}"
      }), R++;
      continue;
    }
    if (e === "[") {
      a.push({
        type: "paren",
        value: "["
      }), R++;
      continue;
    }
    if (e === "]") {
      a.push({
        type: "paren",
        value: "]"
      }), R++;
      continue;
    }
    if (e === ":") {
      a.push({
        type: "separator",
        value: ":"
      }), R++;
      continue;
    }
    if (e === ",") {
      a.push({
        type: "delimiter",
        value: ","
      }), R++;
      continue;
    }
    if (e === '"') {
      let h = "",
        i = !1;
      e = T[++R];
      while (e !== '"') {
        if (R === T.length) {
          i = !0;
          break;
        }
        if (e === "\\") {
          if (R++, R === T.length) {
            i = !0;
            break;
          }
          h += e + T[R], e = T[++R];
        } else h += e, e = T[++R];
      }
      if (e = T[++R], !i) a.push({
        type: "string",
        value: h
      });
      continue;
    }
    if (e && /\s/.test(e)) {
      R++;
      continue;
    }
    let t = /[0-9]/;
    if (e && t.test(e) || e === "-" || e === ".") {
      let h = "";
      if (e === "-") h += e, e = T[++R];
      while (e && t.test(e) || e === ".") h += e, e = T[++R];
      a.push({
        type: "number",
        value: h
      });
      continue;
    }
    let r = /[a-z]/i;
    if (e && r.test(e)) {
      let h = "";
      while (e && r.test(e)) {
        if (R === T.length) break;
        h += e, e = T[++R];
      }
      if (h === "true" || h === "false" || h === "null") a.push({
        type: "name",
        value: h
      });else {
        R++;
        continue;
      }
      continue;
    }
    R++;
  }
  return a;
}
function uy(T) {
  if (T.length === 0) return T;
  let R = T[T.length - 1];
  if (!R) return T;
  switch (R.type) {
    case "separator":
      return uy(T.slice(0, T.length - 1));
    case "number":
      {
        let a = R.value[R.value.length - 1];
        if (a === "." || a === "-") return uy(T.slice(0, T.length - 1));
        break;
      }
    case "string":
      {
        let a = T[T.length - 2];
        if (a?.type === "delimiter") return uy(T.slice(0, T.length - 1));else if (a?.type === "brace" && a.value === "{") return uy(T.slice(0, T.length - 1));
        break;
      }
    case "delimiter":
      return uy(T.slice(0, T.length - 1));
  }
  return T;
}
function elR(T) {
  let R = [];
  for (let a of T) {
    if (a.type === "brace") if (a.value === "{") R.push("}");else {
      let e = R.lastIndexOf("}");
      if (e !== -1) R.splice(e, 1);
    }
    if (a.type === "paren") if (a.value === "[") R.push("]");else {
      let e = R.lastIndexOf("]");
      if (e !== -1) R.splice(e, 1);
    }
  }
  if (R.length > 0) {
    R.reverse();
    for (let a of R) if (a === "}") T.push({
      type: "brace",
      value: "}"
    });else if (a === "]") T.push({
      type: "paren",
      value: "]"
    });
  }
  return T;
}
function tlR(T) {
  let R = "";
  for (let a of T) switch (a.type) {
    case "string":
      R += '"' + a.value + '"';
      break;
    default:
      R += a.value;
      break;
  }
  return R;
}
function j2(T) {
  let R = tlR(elR(uy(alR(T))));
  return JSON.parse(R);
}
function rlR(T) {
  try {
    let R = j2(T);
    if (R !== null && typeof R === "object" && !Array.isArray(R)) return R;
    return {};
  } catch {
    return {};
  }
}
function _ET(T, R, a = "...") {
  if (T.length <= R) return T;
  return T.slice(0, Math.max(0, R - a.length)) + a;
}
function hlR(T) {
  let R = T.match(/^(?:cat\s+)?<<['"]?(\w+)['"]?\s*\n([\s\S]*?)\n\1\s*$/);
  if (R) return R[2];
  return T;
}
function ilR(T, R) {
  let a = T[R];
  if (!a) return null;
  let e = a.match(/^\*\*\* Add File: (.+)$/);
  if (e) return {
    filePath: e[1],
    nextIdx: R + 1
  };
  let t = a.match(/^\*\*\* Delete File: (.+)$/);
  if (t) return {
    filePath: t[1],
    nextIdx: R + 1
  };
  let r = a.match(/^\*\*\* Update File: (.+)$/);
  if (r) {
    let h,
      i = R + 1,
      c = T[i];
    if (c) {
      let s = c.match(/^\*\*\* Move to: (.+)$/);
      if (s) h = s[1], i++;
    }
    return {
      filePath: r[1],
      movePath: h,
      nextIdx: i
    };
  }
  return null;
}
function g0T(T) {
  return T.startsWith("*** Add File:") || T.startsWith("*** Update File:") || T.startsWith("*** Delete File:") || T.trim() === "*** End Patch";
}
function clR(T, R) {
  let a = [],
    e = R;
  while (e < T.length) {
    let t = T[e];
    if (g0T(t)) break;
    if (t.startsWith("+")) a.push(t.slice(1));else if (t === "") a.push("");else throw Error(`Invalid patch format: Add File lines must start with '+', got: "${t.slice(0, 20)}${t.length > 20 ? "..." : ""}"`);
    e++;
  }
  return {
    content: a.join(`
`),
    nextIdx: e
  };
}
function bET(T) {
  return T.startsWith("+") || T.startsWith("-") || T.startsWith(" ");
}
function slR(T, R) {
  let a = [],
    e = R;
  while (e < T.length) {
    let t = T[e];
    if (g0T(t)) break;
    if (t.trim() === "*** End of File") {
      e++;
      continue;
    }
    if (t.startsWith("@@") || bET(t)) {
      let {
        chunk: r,
        nextIdx: h
      } = olR(T, e);
      a.push(r), e = h;
      continue;
    }
    throw Error(`Invalid patch format: unexpected line in Update File: "${t.slice(0, 30)}..."`);
  }
  return {
    chunks: a,
    nextIdx: e
  };
}
function olR(T, R) {
  let a = R,
    e = [],
    t = [],
    r = !1,
    h = [];
  while (a < T.length && T[a].startsWith("@@")) {
    let c = T[a].slice(2).trimStart();
    if (c) h.push(c);
    a++;
  }
  while (a < T.length) {
    let c = T[a];
    if (c.trim() === "*** End of File") {
      r = !0, a++;
      break;
    }
    if (c.startsWith("@@") || g0T(c)) break;
    if (!bET(c)) throw Error(`Invalid patch format: hunk lines must start with ' ', '-', or '+', got: "${c.slice(0, 20)}..."`);
    if (c.startsWith("-")) e.push(c.slice(1));else if (c.startsWith("+")) t.push(c.slice(1));else if (c.startsWith(" ")) e.push(c.slice(1)), t.push(c.slice(1));
    a++;
  }
  let i = h.length > 0 ? h.filter(Boolean).join(`
`) : void 0;
  return {
    chunk: {
      oldLines: e,
      newLines: t,
      changeContext: i,
      isEndOfFile: r
    },
    nextIdx: a
  };
}
function XS(T) {
  let R = hlR(T.trim()).split(`
`),
    a = [],
    e = [],
    t = "*** Begin Patch",
    r = "*** End Patch",
    h = R.findIndex(o => o.trim() === "*** Begin Patch"),
    i = R.findIndex(o => o.trim() === "*** End Patch");
  if (h === -1 && i === -1) throw Error(`Invalid patch format: missing *** Begin Patch and *** End Patch markers.
Expected format:
*** Begin Patch
*** Add File: path/to/file.ts
+file contents
*** End Patch`);
  if (h === -1) throw Error('Invalid patch format: missing *** Begin Patch marker. Patch must start with "*** Begin Patch"');
  if (i === -1) throw Error('Invalid patch format: missing *** End Patch marker. Patch must end with "*** End Patch"');
  if (i < h) throw Error("Invalid patch format: *** End Patch appears before *** Begin Patch. Check marker ordering.");
  let c = R.slice(0, h).filter(o => o.trim() !== "");
  if (c.length > 0) e.push(`Warning: ${c.length} non-empty line(s) before *** Begin Patch were ignored. First ignored: "${c[0].slice(0, 40)}${c[0].length > 40 ? "..." : ""}"`);
  let s = R.findIndex((o, n) => n > h && o.trim() === "*** Begin Patch");
  if (s !== -1 && s < i) e.push(`Warning: duplicate "*** Begin Patch" found at line ${s + 1}. Only the first marker is used.`);
  let A = R.slice(i + 1).filter(o => o.trim() !== "");
  if (A.length > 0) e.push(`Warning: ${A.length} non-empty line(s) after *** End Patch were ignored. First ignored: "${A[0].slice(0, 40)}${A[0].length > 40 ? "..." : ""}"`);
  let l = h + 1;
  while (l < i) {
    let o = ilR(R, l);
    if (!o) {
      l++;
      continue;
    }
    let n = R[l];
    if (n.startsWith("*** Add File:")) {
      let {
        content: p,
        nextIdx: _
      } = clR(R, o.nextIdx);
      a.push({
        type: "add",
        path: o.filePath,
        contents: p
      }), l = _;
    } else if (n.startsWith("*** Delete File:")) a.push({
      type: "delete",
      path: o.filePath
    }), l = o.nextIdx;else if (n.startsWith("*** Update File:")) {
      let {
        chunks: p,
        nextIdx: _
      } = slR(R, o.nextIdx);
      a.push({
        type: "update",
        path: o.filePath,
        movePath: o.movePath,
        chunks: p
      }), l = _;
    } else l++;
  }
  return {
    hunks: a,
    warnings: e.length > 0 ? e : void 0
  };
}
function LlR(T, R) {
  return {
    added: T.added + R.added,
    deleted: T.deleted + R.deleted,
    changed: T.changed + R.changed
  };
}
function OET(T) {
  return T.reduce((R, a) => LlR(R, a), {
    added: 0,
    deleted: 0,
    changed: 0
  });
}
function kx(T, R) {
  let a = {
    added: 0,
    deleted: 0,
    changed: 0
  };
  if (typeof T !== "string" || typeof R !== "string") return a;
  if (T === R) return a;
  try {
    let e = {
      added: 0,
      deleted: 0,
      changed: 0
    };
    for (let [t, r, h, i] of EET.diff(T.split(`
`), R.split(`
`))) e.deleted += r - t, e.added += i - h, e.changed += Math.min(r - t, i - h);
    return e;
  } catch {
    return a;
  }
}
function xx(T) {
  if (typeof T !== "string") return {
    added: 0,
    deleted: 0,
    changed: 0
  };
  return {
    added: T.split(`
`).length,
    deleted: 0,
    changed: 0
  };
}
function dET(T) {
  if (!T) return {
    totalFiles: 0,
    createdFiles: 0,
    totalAdded: 0,
    totalRemoved: 0,
    totalModified: 0,
    revertedFiles: 0,
    allReverted: !1
  };
  let R = T.files.length,
    a = T.files.filter(c => c.created).length,
    e = T.files.filter(c => c.reverted).length,
    t = e === R && R > 0,
    r = 0,
    h = 0,
    i = 0;
  for (let c of T.files) {
    if (c.reverted) continue;
    r += c.diffStat.added, h += c.diffStat.removed, i += c.diffStat.modified;
  }
  return {
    totalFiles: R,
    createdFiles: a,
    totalAdded: r,
    totalRemoved: h,
    totalModified: i,
    revertedFiles: e,
    allReverted: t
  };
}
function MlR(T) {
  return T.trim().replace(CET, "");
}
function DlR(T) {
  let R = T.split("/").filter(Boolean);
  for (let a = R.length - 1; a >= 0; a--) {
    let e = R[a];
    if (e && Vt(e)) return e;
  }
  return null;
}
function mr(T) {
  let R = MlR(T);
  if (!R) return null;
  if (Vt(R)) return R;
  let a;
  try {
    a = new URL(R);
  } catch {
    return null;
  }
  if (!znR(a)) return null;
  return DlR(a.pathname);
}
function Eh() {
  return `T-${VS()}`;
}
function Vt(T) {
  return KET.safeParse(T).success;
}
function fx() {
  return `toolu_${crypto.randomUUID()}`;
}
function iN(T, R, a = fx()) {
  return {
    type: "tool_use",
    complete: !0,
    id: a,
    name: T,
    input: R
  };
}
function wlR(T) {
  if (!T || typeof T !== "object") return !1;
  return T.type === "text";
}
function S0T(T) {
  if (typeof T === "string") return {
    text: T,
    images: []
  };
  let R = T.filter(e => e.type === "text").map(e => e.text).join(`
`),
    a = T.filter(e => e.type === "image");
  return {
    text: R,
    images: a
  };
}
function Va(T) {
  if ("complete" in T) return T.complete;
  return !("inputPartialJSON" in T);
}
function LET(T) {
  if (!T || typeof T !== "object") return;
  let R = T,
    a = typeof R.sentAt === "number" ? R.sentAt : void 0,
    e = R.fromAggman === !0 || "aggman" in R && !!R.aggman ? !0 : void 0,
    t = typeof R.fromExecutorThreadID === "string" && Vt(R.fromExecutorThreadID) ? R.fromExecutorThreadID : void 0;
  if (a === void 0 && e === void 0 && t === void 0) return;
  return {
    ...(a !== void 0 ? {
      sentAt: a
    } : {}),
    ...(e === !0 ? {
      fromAggman: e
    } : {}),
    ...(t !== void 0 ? {
      fromExecutorThreadID: t
    } : {})
  };
}
function MET(T) {
  return T.nextMessageId ?? T.messages.reduce((R, a) => Math.max(R, a.messageId), -1) + 1;
}
function DET(T, R) {
  return T.messages.findIndex(a => a.role === "user" && a.dtwMessageID === R);
}
function BlR(T, R) {
  let a = DET(T, R);
  if (a < 0) return;
  let e = T.messages[a];
  if (!e || e.role !== "user") return;
  return {
    index: a,
    message: e
  };
}
function wET(T, R) {
  if (T.length !== R.length) return !1;
  return T.every((a, e) => {
    let t = R[e];
    if (!t || a.type !== t.type) return !1;
    switch (a.type) {
      case "text":
        return t.type === "text" && a.text === t.text;
      case "image":
        {
          if (t.type !== "image") return !1;
          let r = t.source;
          if (a.source.type !== r.type) return !1;
          if (a.source.type === "base64") {
            if (r.type !== "base64") return !1;
            return a.source.mediaType === r.mediaType && a.source.data === r.data && a.sourcePath === t.sourcePath;
          }
          if (r.type !== "url") return !1;
          return a.source.url === r.url && a.sourcePath === t.sourcePath;
        }
      case "tool_result":
        return t.type === "tool_result" && a.toolUseID === t.toolUseID;
    }
  });
}
function $h(T) {
  for (let R = T.messages.length - 1; R >= 0; R--) {
    let a = T.messages[R];
    if (a?.parentToolUseId) continue;
    if (a?.role === "info") {
      let e = a.content[0];
      if (e?.type === "summary" && e?.summary.type === "message") return;
    }
    if (a?.role === "assistant" && a.usage) {
      if (a.usage.totalInputTokens === 0) continue;
      return a.usage;
    }
  }
  return;
}
function Tn(T, R) {
  for (let a = T.messages.length - 1; a >= 0; a--) {
    let e = T.messages[a];
    if (e?.role !== "assistant") continue;
    for (let t of e.content) if (t.type === "tool_use" && t.id === R) return t;
  }
  return;
}
function gj(T, R) {
  for (let [a, e] of T.messages.entries()) {
    if (e.role !== "assistant") continue;
    for (let [t, r] of e.content.entries()) if (r.type === "tool_use" && r.id === R) return {
      message: e,
      messageIndex: a,
      block: r,
      blockIndex: t
    };
  }
  return null;
}
function cN(T, R) {
  for (let a of T.messages) {
    if (a.role !== "user") continue;
    for (let e of a.content) if (e.type === "tool_result" && e.toolUseID === R) return e;
  }
  return;
}
function sA(T) {
  return T.messages.filter(R => R.role === "user").flatMap(R => R.content).filter(R => R.type === "tool_result").reduce((R, a) => {
    return R.set(a.toolUseID, a), R;
  }, new Map());
}
function BET(T, R = "Untitled") {
  if (T?.title) return _ET(T.title, 300);
  return R;
}
function NlR(T) {
  if (!T) return !1;
  if (T.role === "assistant") return T.state?.type === "cancelled";
  if (T.role === "user") return T.content.some(R => R.type === "tool_result" && R.run.status === "cancelled");
  return !1;
}
function UlR(T) {
  if (!T) return !1;
  return T.role !== "assistant";
}
function HlR(T) {
  if (!T) return !1;
  if (T.role === "user") return T.content.some(R => R.type === "tool_result" && R.run.status === "rejected-by-user");
  return !1;
}
function NET(T) {
  if (!T) return !1;
  return T.role === "info";
}
function ok(T) {
  return T.role === "info" && T.content.some(R => R.type === "manual_bash_invocation");
}
function ZS(T) {
  if (T.role !== "info") return;
  return T.content.find(R => R.type === "manual_bash_invocation");
}
function WlR(T) {
  return T.replace(/u([0-9A-Fa-f]{4})(\s)/gi, (R, a, e) => {
    try {
      return String.fromCodePoint(parseInt(a, 16)) + e;
    } catch {
      return `u${a}${e}`;
    }
  });
}
function O0T(T) {
  for (let R = T.messages.length - 1; R >= 0; R--) {
    let a = T.messages[R];
    if (a?.role === "info") {
      if (a.content.some(e => e.type === "summary" && e.summary.type === "message")) break;
    }
    if (a?.role !== "assistant" || !a.state || a.state.type !== "complete" || a.state.stopReason !== "tool_use") continue;
    for (let e of a.content) if (e.type === "tool_use" && e.name === llR && e.input) {
      let t = e.input.todos;
      if (Array.isArray(t)) return t;
      let r = e.input.content;
      if (typeof r === "string") return WlR(r);
    }
  }
  return;
}
function kr(T) {
  return T.map(R => R.type === "text" ? R.text : null).filter(R => R !== null).join(`

`);
}
function wt(T) {
  return T === "done" || T === "error" || T === "rejected-by-user" || T === "cancelled";
}
function qlR(T) {
  return T.content.every(R => {
    return !(R.type === "tool_result" && !wt(R.run.status));
  });
}
function UET(T) {
  return T.role === "assistant" && T.state.type === "complete" && T.state.stopReason === "end_turn";
}
function dt(T, R) {
  return T.messages.findLast(a => a.role === R);
}
function pm(T) {
  for (let R = T.messages.length - 1; R >= 0; R--) {
    let a = T.messages[R];
    if (a && "role" in a && a.role === "info") {
      for (let e of a.content) if (e.type === "summary" && e.summary.type === "message") return {
        summaryBlock: e,
        index: R
      };
    }
  }
  return;
}
function ve(T) {
  return T.messages.filter(R => R.role === "user" && R.content.some(a => a.type !== "tool_result")).length;
}
function kiT(T) {
  return T.startsWith("functions.") ? T.slice(10) : T;
}
function HET(T) {
  if (T.type === "tool_use" && Va(T)) {
    let R = T.normalizedName ?? T.name;
    if (!R) return null;
    let a = T.input;
    return {
      name: kiT(R),
      input: a
    };
  }
  if (T.type === "server_tool_use") {
    if (!T.name) return null;
    return {
      name: kiT(T.name),
      input: T.input
    };
  }
  return null;
}
function WET(T) {
  if (!("patchText" in T) || typeof T.patchText !== "string") return [];
  let R;
  try {
    R = XS(T.patchText);
  } catch (e) {
    return J.debug("thread.diffStats.applyPatch.parseFailed", {
      error: e,
      patchTextLength: T.patchText.length
    }), [];
  }
  let a = [];
  for (let e of R.hunks) {
    if (e.type === "delete") continue;
    if (e.type === "add") {
      a.push({
        path: e.path,
        diffStat: xx(e.contents)
      });
      continue;
    }
    let t = OET(e.chunks.map(r => kx(r.oldLines.join(`
`), r.newLines.join(`
`))));
    a.push({
      path: e.movePath ?? e.path,
      diffStat: t
    });
  }
  return a;
}
function qET(T) {
  let R = 0,
    a = 0,
    e = 0;
  return T.messages.forEach(t => {
    if (t.role !== "assistant") return;
    t.content.forEach(r => {
      let h = HET(r);
      if (!h) return;
      let {
          name: i,
          input: c
        } = h,
        s = null;
      if (i === "edit_file") {
        if ("old_str" in c && "new_str" in c) {
          let {
            old_str: A,
            new_str: l
          } = c;
          s = kx(A, l);
        }
      } else if (i === "apply_patch") {
        let A = WET(c);
        s = OET(A.map(l => l.diffStat));
      } else if ((i === "write_file" || i === "create_file") && "content" in c && typeof c.content === "string") s = xx(c.content);
      if (s) R += s.added, e += s.deleted, a += s.changed;
    });
  }), {
    added: R,
    changed: a,
    deleted: e
  };
}
function zlR(T) {
  let R = new Map();
  return T.messages.forEach(a => {
    if (a.role !== "assistant") return;
    a.content.forEach(e => {
      let t = HET(e);
      if (!t) return;
      let {
          name: r,
          input: h
        } = t,
        i,
        c = null;
      if (r === "edit_file") {
        if ("path" in h && typeof h.path === "string" && "old_str" in h && "new_str" in h) {
          i = h.path;
          let {
            old_str: s,
            new_str: A
          } = h;
          c = kx(s, A);
        }
      } else if (r === "apply_patch") {
        for (let s of WET(h)) {
          let A = xiT(s.path, T.env?.initial?.trees);
          if (A) {
            let l = R.get(A) ?? {
              added: 0,
              changed: 0,
              deleted: 0
            };
            l.added += s.diffStat.added, l.changed += s.diffStat.changed, l.deleted += s.diffStat.deleted, R.set(A, l);
          }
        }
        return;
      } else if ((r === "write_file" || r === "create_file") && "path" in h && typeof h.path === "string" && "content" in h && typeof h.content === "string") i = h.path, c = xx(h.content);
      if (i && c) {
        let s = xiT(i, T.env?.initial?.trees);
        if (s) {
          let A = R.get(s) ?? {
            added: 0,
            changed: 0,
            deleted: 0
          };
          A.added += c.added, A.changed += c.changed, A.deleted += c.deleted, R.set(s, A);
        }
      }
    });
  }), R;
}
function xiT(T, R) {
  let a = T.startsWith("/"),
    e = /^[a-zA-Z]:[\\/]/.test(T);
  if (!a && !e) return T;
  let t = T.replace(/\\/g, "/");
  if (R && R.length > 0) for (let i of R) {
    if (!i.uri) continue;
    let c = i.uri.match(/^file:\/\/(.+)$/);
    if (!c?.[1]) continue;
    let s = decodeURIComponent(c[1]).replace(/\\/g, "/"),
      A = s.startsWith("/") && /^\/[a-zA-Z]:/.test(s) ? s.slice(1) : s;
    if (t.startsWith(A)) {
      let l = t.slice(A.length);
      return l.startsWith("/") ? l.slice(1) : l;
    }
  }
  let r = t.match(/\/(?:Users|home)\/[^/]+\/[^/]+\/(.+)/);
  if (r?.[1]) return r[1];
  let h = t.match(/^[a-zA-Z]:\/Users\/[^/]+\/[^/]+\/(.+)/);
  if (h?.[1]) return h[1];
  return null;
}
function vD(T, R) {
  let a = T.relationships?.filter(r => r.role === "child") ?? [],
    e = GET(T),
    t = [...a, ...e];
  return R ? t.filter(r => r.type === R) : t;
}
function zET(T, R) {
  return vD(T, R)[0];
}
function _m(T) {
  for (let R = T.messages.length - 1; R >= 0; R--) {
    let a = T.messages[R];
    if (a?.role === "user") return a;
  }
  return;
}
function FET(T) {
  for (let R = T.messages.length - 1; R >= 0; R--) {
    let a = T.messages[R];
    if (a?.role === "user" && a.agentMode) return a.agentMode;
  }
  return;
}
function GET(T) {
  let R = [],
    a = new Set();
  if (!T.messages) return R;
  return T.messages.forEach((e, t) => {
    if (e.role !== "assistant") return;
    e.content.forEach(r => {
      if (r.type !== "tool_use") return;
      if (r.name !== Ij) return;
      if (!Va(r)) return;
      let h = r.input,
        i = typeof h.threadID === "string" ? mr(h.threadID) : null;
      if (i && !a.has(i)) a.add(i), R.push({
        threadID: i,
        type: "mention",
        role: "parent",
        messageIndex: t,
        createdAt: Date.now()
      });
    });
  }), R;
}
function Vs(T) {
  if (!T) return {};
  return {
    [VET]: T.id,
    [FlR]: T.agentMode ?? ""
  };
}
function YlR(T) {
  XET = T;
}
function Mg(T) {
  Dg = T;
}
function QlR(T) {
  YET = T;
}
function ZlR(T) {
  $j = T.installationID, vj = T.deviceFingerprint;
}
function JlR() {
  if (!$j || !vj) return;
  return {
    installationID: $j,
    deviceFingerprint: vj
  };
}
function sN() {
  let T = typeof process < "u" ? process.env.AMP_SDK_VERSION : void 0;
  if (T) return {
    type: "cli",
    name: "AmpSDK",
    version: T
  };
  let R;
  if (!Dg) R = "CLI";else if (["Neovim", "JetBrains", "Zed"].includes(Dg)) R = Dg;else R = `${Dg} CLI`;
  return {
    type: "cli",
    name: YET ? `${R} Execute Mode` : R,
    version: XET
  };
}
function Xs() {
  let T = sN(),
    R = {};
  if (R[GlR] = T.name, R[d0T] = T.type, $j) R[VlR] = $j;
  if (vj) R[XlR] = vj;
  if (T.version) R[KlR] = T.version;
  return R;
}
function TAR(T) {
  if (typeof process > "u" || !process.versions?.node) return "unknown";
  try {
    switch (T) {
      case "darwin":
        {
          try {
            let {
                execSync: R
              } = qT("node:child_process"),
              a = R("/usr/bin/sw_vers -productVersion", {
                encoding: "utf8",
                timeout: 3000,
                stdio: ["ignore", "pipe", "ignore"]
              }).trim();
            if (a && /^\d+\.\d+/.test(a)) return a;
          } catch {}
          return qT("node:os").release();
        }
      case "linux":
        try {
          let R = qT("node:fs").readFileSync("/etc/os-release", "utf8").split(`
`);
          for (let a of R) if (a.startsWith("PRETTY_NAME=")) {
            let e = a.match(/PRETTY_NAME="?([^"]*)"?/);
            if (e?.[1]) return e[1];
          }
          return qT("node:os").release();
        } catch {
          return qT("node:os").release();
        }
      case "windows":
        try {
          let {
              execSync: R
            } = qT("node:child_process"),
            a = R('systeminfo | findstr /B /C:"OS Name" /C:"OS Version"', {
              encoding: "utf8",
              timeout: 5000
            }).split(`
`),
            e = a.find(r => r.includes("OS Name")),
            t = a.find(r => r.includes("OS Version"));
          if (e && t) {
            let r = e.split(":")[1]?.trim(),
              h = t.split(":")[1]?.trim();
            return `${r} ${h}`;
          }
          return qT("node:os").release();
        } catch {
          return qT("node:os").release();
        }
      default:
        return "unknown";
    }
  } catch {
    return "unknown";
  }
}
function JS() {
  if (!NW) {
    let T = typeof process < "u" && process.versions?.node,
      R = !T,
      a = "linux",
      e = "unknown",
      t = "unknown";
    if (T) a = "darwin", e = TAR(a), t = "arm64";else if (typeof navigator < "u") {
      let r = navigator.platform.toLowerCase();
      if (r.includes("mac") || r.includes("ios")) a = "darwin";else if (r.includes("win")) a = "windows";
      let h = navigator.userAgent;
      if (a === "darwin") {
        let i = h.match(/Mac OS X (\d+[._]\d+[._]?\d*)/);
        if (i?.[1]) e = i[1].replace(/_/g, ".");
      } else if (a === "windows") {
        let i = h.match(/Windows NT (\d+\.\d+)/);
        if (i?.[1]) e = i[1];
      } else {
        let i = h.match(/Linux.*?(\d+\.\d+)/);
        if (i?.[1]) e = i[1];
      }
      if (h.includes("x86_64") || h.includes("WOW64")) t = "x64";else if (h.includes("i686")) t = "x86";else if (h.includes("ARM64") || h.includes("arm64")) t = "arm64";else if (h.includes("ARM")) t = "arm";
    }
    NW = {
      webBrowser: R,
      os: a,
      osVersion: e,
      cpuArchitecture: t,
      client: sN().name,
      optionAltKeyShort: a === "darwin" ? "\u2325" : "Alt",
      ctrlCmdKeyShort: a === "darwin" ? "\u2318" : "\u2303",
      ctrlCmdKey: a === "darwin" ? "\u2318" : "Ctrl"
    };
  }
  return NW;
}
function ya(T) {
  let R = n8[T];
  return `${R.provider}/${R.name}`;
}
function RO(T) {
  let R = T.indexOf("/");
  if (R === -1) throw Error(`Invalid provider/model format: ${T}`);
  return {
    provider: T.slice(0, R),
    model: T.slice(R + 1)
  };
}
function oN(T) {
  switch (T) {
    case "anthropic":
      return n8.CLAUDE_SONNET_4_5;
    case "openai":
      return n8.GPT_5_4;
    case "xai":
      return n8.GROK_CODE_FAST_1;
    case "cerebras":
      return n8.Z_AI_GLM_4_7;
    case "fireworks":
      return n8.FIREWORKS_GLM_4P6;
    case "baseten":
      return n8.BASETEN_KIMI_K2P5;
    case "moonshotai":
      return n8.KIMI_K2_INSTRUCT;
    case "openrouter":
      return n8.SONOMA_SKY_ALPHA;
    case "groq":
      return n8.GPT_OSS_120B;
    case "vertexai":
      return n8.GEMINI_3_1_PRO_PREVIEW;
    default:
      throw Error(`Unknown provider: ${T}`);
  }
}
function dn(T) {
  let {
    provider: R,
    model: a
  } = RO(T);
  for (let e of Object.values(n8)) if (e.provider === R && e.name === a) return e;
  return oN(R);
}
function E0T(T) {
  for (let a of Object.values(n8)) if (a.name === T) return a;
  let R = T.match(/^(.*)-\d{4}-\d{2}-\d{2}$/);
  if (R) {
    let a = R[1];
    for (let e of Object.values(n8)) if (e.name === a) return e;
  }
  return;
}
function Xt(T) {
  let R = T.indexOf("/");
  if (R === -1) return T;
  return T.slice(R + 1);
}
function Ys(T) {
  let R = dn(T);
  return R.contextWindow - R.maxOutputTokens;
}
function QET(T) {
  return dn(T).maxOutputTokens;
}
function JET(T) {
  return T === C0T;
}
function qo(T) {
  return T === "deep" || T === C0T;
}
function nN(T, R) {
  if (!JET(T)) return !0;
  return Boolean(R && Ns(R));
}
function IiT(T, R) {
  let a = xi(R);
  if (!a) return !1;
  if (aCT.has(T)) {
    let e = a.finder ?? ZET.FINDER,
      t = eCT[e];
    if (T !== t) return !1;
  }
  if (a.includeTools) {
    if (a.deferredTools?.includes(T)) return !0;
    return a.includeTools.includes(T);
  }
  return !0;
}
function RAR(T, R) {
  let a = xi(R);
  if (!a) return !1;
  return a.deferredTools?.includes(T) ?? !1;
}
function Kl(T, R, a) {
  let e = T?.["internal.visibleModes"] ?? [],
    t = T?.["experimental.modes"] ?? [],
    r = [...e, ...t],
    h = new Set(T?.disabledAgentModes ?? []);
  return Object.values(Ab).filter(i => {
    if (!nN(i.key, a?.userEmail)) return !1;
    if (i.key === L0T) return !1;
    if (r.includes(`!${i.key}`)) return !1;
    if (R === !1 && qt(i.key)) return !1;
    if (h.has(i.key)) return !1;
    if (a?.v2 && !("visibleInV2" in i && i.visibleInV2)) return !1;
    let c = "visible" in i ? i.visible : !1,
      s = r.includes(i.key);
    return c || s;
  }).map(i => ({
    mode: i.key,
    description: "description" in i ? i.description : void 0
  })).sort((i, c) => i.mode.localeCompare(c.mode));
}
function aAR(T, R, a) {
  let e = Kl(T, R, a),
    t = new Set(T?.disabledAgentModes ?? []),
    r = M0T.filter(h => {
      if (!xi(h)) return !1;
      if (t.has(h)) return !1;
      if (R === !1 && qt(h)) return !1;
      if (!nN(h, a?.userEmail)) return !1;
      return !0;
    }).sort((h, i) => h.localeCompare(i));
  return {
    visibleAgentModes: e,
    allowedAgentModes: r
  };
}
function xi(T) {
  return Object.values(Ab).find(R => R.key === T);
}
function nk(T) {
  return xi(T)?.primaryModel ?? ya("CLAUDE_SONNET_4_5");
}
function TCT(T) {
  let R = xi(T);
  if (!R) return !1;
  return dn(R.primaryModel).capabilities?.vision ?? !1;
}
function qt(T) {
  return T === "free" || T.startsWith("free-");
}
function eAR(T, R) {
  return R.find(a => a.mode === T)?.description;
}
function RCT(T, R) {
  let a = (R.findIndex(e => e.mode === T) + 1) % R.length;
  return R[a]?.mode ?? "smart";
}
function O2(T) {
  return T["agent.deepReasoningEffort"] ?? "high";
}
function hCT(T) {
  let R = cCT.flatMap(a => {
    let e = T[a];
    return e === void 0 ? [] : [[a, e]];
  });
  return Object.fromEntries(R);
}
function iCT(T) {
  return sCT.includes(T);
}
function tAR(T) {
  let R = T["internal.model"];
  if (R && typeof R === "object") {
    let a = R.oracle?.trim();
    if (a && a.length > 0) {
      let e = a.indexOf(":");
      return e === -1 ? a : a.slice(e + 1).trim();
    }
  }
  return n8.GPT_5_4.name;
}
function rAR(T, R) {
  let a = T["internal.model"];
  if (!a) return null;
  let e;
  if (typeof a === "string") e = a.trim();else e = a[R]?.trim();
  if (!e || e.length === 0) return null;
  let t = e.indexOf(":");
  if (t === -1) return null;
  let r = e.slice(0, t).trim(),
    h = e.slice(t + 1).trim();
  if (!r || !h) return null;
  return `${r}/${h}`;
}
function lCT(T) {
  if (!T) return !1;
  return T.range.startLine === T.range.endLine && T.range.startCharacter === T.range.endCharacter;
}
function aO(T) {
  if (T <= 0) return !1;
  try {
    return process.kill(T, 0), !0;
  } catch (R) {
    let a = R?.code;
    if (a === "ESRCH") return !1;
    if (a === "EPERM" || a === "EACCES") return !0;
    return J.debug("PID check error", {
      pid: T,
      code: a
    }), !1;
  }
}
async function cAR(T) {
  try {
    if (!(await OAR())) return [];
    let R = await vAR(T);
    if (!R) return [];
    let a = await _CT(T);
    return (await pCT(T, a)).map(e => ({
      workspaceFolders: [e.workspaceFolder],
      port: 0,
      ideName: T.ideName,
      authToken: "",
      pid: R,
      connection: "query"
    }));
  } catch (R) {
    return J.debug(`Failed to list ${T.ideName} configs`, {
      error: R instanceof Error ? R.message : String(R)
    }), [];
  }
}
async function sAR(T, R) {
  if (!R.pid || !aO(R.pid)) return null;
  let a = R.workspaceFolders[0];
  if (!a) return null;
  let e = await _CT(T),
    t = (await pCT(T, e)).find(h => SD(h.workspaceFolder) === SD(a));
  if (!t) return null;
  let r = await pAR(t.stateDBPath);
  if (!r) return {
    openFiles: []
  };
  return r;
}
function oAR(T, R) {
  let {
    filePath: a,
    line: e,
    column: t
  } = lAR(R);
  if (!a) return !1;
  let r = e ? `${a}:${e}${t ? `:${t}` : ""}` : a,
    h = dAR(T);
  if (!h) return LiT(T, a, e, t);
  if (jD(h, ["--goto", r], {
    stdio: "ignore"
  }).status === 0) return !0;
  return LiT(T, a, e, t);
}
function LiT(T, R, a, e) {
  let t = R.replaceAll("\\", "/"),
    r = (t.startsWith("/") ? t : `/${t}`).split("/").map(s => encodeURIComponent(s)).join("/"),
    h = a ? `:${a}${e ? `:${e}` : ""}` : "",
    i = `${T.urlScheme}://file${r}${h}`,
    c = nAR(i);
  if (c.status === 0) return !0;
  return J.debug(`Failed to open URI with ${T.ideName} URL scheme`, {
    schemeURI: i,
    status: c.status,
    stderr: c.stderr?.toString().trim()
  }), !1;
}
function nAR(T) {
  return jD("open", [T], {
    stdio: "ignore"
  });
}
function lAR(T) {
  try {
    let R = zR.parse(T);
    if (R.scheme !== "file") return {};
    let a = AAR(R.fragment);
    return {
      filePath: R.fsPath,
      line: a?.line,
      column: a?.column
    };
  } catch {
    return {};
  }
}
function AAR(T) {
  let R = T.match(mCT),
    a = R?.groups?.line;
  if (!a) return null;
  return {
    line: Number.parseInt(a, 10),
    column: R.groups?.column ? Number.parseInt(R.groups.column, 10) : void 0
  };
}
async function pAR(T) {
  let R = await gAR(T, "select key, value from ItemTable where key in ('memento/workbench.parts.editor', 'memento/workbench.editors.files.textFileEditor')");
  if (R.length === 0) return null;
  let a = _AR(R.find(c => c.key === "memento/workbench.parts.editor")?.value);
  if (!a) return null;
  let e = a.leaves.flatMap(c => c.editors),
    t = a.leaves.find(c => c.id === a.activeGroup) ?? a.leaves[0],
    r = t ? mAR(t) : void 0,
    h = uAR(R.find(c => c.key === "memento/workbench.editors.files.textFileEditor")?.value),
    i = r ? await yAR(r, a.activeGroup, h) : void 0;
  return {
    openFile: r,
    openFiles: e,
    selection: i
  };
}
function _AR(T) {
  if (!T) return null;
  try {
    let R = JSON.parse(T),
      a = R["editorpart.state"] ?? R.editorpart?.state,
      e = a?.activeGroup;
    if (typeof e !== "number") return null;
    let t = a?.serializedGrid,
      r = ACT(t?.root ?? t);
    return {
      activeGroup: e,
      leaves: r
    };
  } catch (R) {
    return J.debug("Failed to parse VS Code editor state", {
      error: R instanceof Error ? R.message : String(R)
    }), null;
  }
}
function ACT(T) {
  if (!T || typeof T !== "object") return [];
  let R = T;
  if (R.type === "leaf") {
    let a = R.data;
    if (typeof a?.id !== "number") return [];
    let e = a.editors?.map(t => bAR(t.value)).filter(t => Boolean(t)) ?? [];
    return [{
      id: a.id,
      editors: e,
      preview: typeof a.preview === "number" ? a.preview : void 0,
      mru: Array.isArray(a.mru) ? a.mru.filter(t => Number.isInteger(t)) : []
    }];
  }
  if (R.type === "branch") return (Array.isArray(R.data ?? []) ? R.data ?? [] : []).flatMap(a => ACT(a));
  return [];
}
function bAR(T) {
  if (!T) return;
  try {
    let R = JSON.parse(T),
      a = R.resourceJSON?.external;
    if (a) return d0(zR.parse(a));
    if (R.resourceJSON?.scheme === "file" && R.resourceJSON.path) return d0(zR.file(R.resourceJSON.path));
  } catch (R) {
    J.debug("Failed to parse VS Code editor URI", {
      error: R instanceof Error ? R.message : String(R)
    });
  }
  return;
}
function mAR(T) {
  let R = T.mru[0] ?? T.preview ?? 0;
  return T.editors[R] ?? T.editors[0];
}
function uAR(T) {
  if (!T) return new Map();
  try {
    let R = JSON.parse(T).textEditorViewState ?? [];
    return new Map(R);
  } catch (R) {
    return J.debug("Failed to parse VS Code text editor state", {
      error: R instanceof Error ? R.message : String(R)
    }), new Map();
  }
}
async function yAR(T, R, a) {
  let e = a.get(T) ?? a.get(decodeURIComponent(T)) ?? a.get(encodeURI(T));
  if (!e) return;
  let t = (e[String(R)] ?? Object.values(e)[0])?.cursorState?.[0];
  if (!t) return;
  let r = await PAR(T);
  if (r === void 0) return;
  let h = MiT(t.selectionStart.lineNumber, t.selectionStart.column),
    i = MiT(t.position.lineNumber, t.position.column),
    c = DiT(h, i) <= 0 ? h : i,
    s = DiT(h, i) <= 0 ? i : h,
    A = c.line === s.line && c.character === s.character ? kAR(r, c.line) : xAR(r, c.line, c.character, s.line, s.character);
  return {
    range: {
      startLine: c.line,
      startCharacter: c.character,
      endLine: s.line,
      endCharacter: s.character
    },
    content: A
  };
}
async function PAR(T) {
  try {
    let R = zR.parse(T);
    if (R.scheme !== "file") return;
    return await lk.promises.readFile(R.fsPath, "utf-8");
  } catch (R) {
    J.debug("Failed to read VS Code active file content", {
      fileURI: T,
      error: R instanceof Error ? R.message : String(R)
    });
    return;
  }
}
function MiT(T, R) {
  return {
    line: Math.max(0, T - 1),
    character: Math.max(0, R - 1)
  };
}
function DiT(T, R) {
  if (T.line === R.line) return T.character - R.character;
  return T.line - R.line;
}
function kAR(T, R) {
  return T.split(`
`)[R] ?? "";
}
function xAR(T, R, a, e, t) {
  let r = wiT(T, R, a),
    h = wiT(T, e, t);
  if (h <= r) return "";
  return T.slice(r, h);
}
function wiT(T, R, a) {
  let e = 0,
    t = 0;
  for (let r = 0; r < T.length; r += 1) {
    if (e === R && t === a) return r;
    if (T[r] === `
`) e += 1, t = 0;else t += 1;
  }
  return T.length;
}
async function pCT(T, R) {
  if (R?.size === 0) return [];
  let a = Ai.join(bCT(T), "workspaceStorage");
  if (!(await wg(a))) return [];
  let e = await lk.promises.readdir(a, {
    withFileTypes: !0
  });
  return (await Promise.all(e.filter(t => t.isDirectory()).map(async t => {
    let r = t.name,
      h = Ai.join(a, r),
      i = Ai.join(h, "state.vscdb"),
      c = Ai.join(h, "workspace.json");
    if (!(await wg(i)) || !(await wg(c))) return null;
    let s = await IAR(c);
    if (!s || !(await wg(s))) return null;
    if (R && !R.has(SD(s))) return null;
    let A = await lk.promises.stat(i);
    return {
      storageID: r,
      workspaceFolder: s,
      stateDBPath: i,
      mtime: A.mtimeMs
    };
  }))).filter(t => t !== null).sort((t, r) => r.mtime - t.mtime).slice(0, EAR);
}
async function _CT(T) {
  let R = Ai.join(bCT(T), "globalStorage", "storage.json");
  if (!(await wg(R))) return null;
  try {
    let a = await lk.promises.readFile(R, "utf-8"),
      e = JSON.parse(a).windowsState,
      t = Array.isArray(e?.openedWindows) ? e.openedWindows : [],
      r = t.length > 0 ? t : [e?.lastActiveWindow],
      h = new Set();
    for (let i of r) {
      if (!i) continue;
      let c = fAR(i);
      if (!c) continue;
      h.add(SD(c));
    }
    return h;
  } catch (a) {
    return J.debug(`Failed to parse ${T.ideName} windowsState`, {
      storageFilePath: R,
      error: a instanceof Error ? a.message : String(a)
    }), null;
  }
}
function fAR(T) {
  if (T.folder) return BiT(T.folder);
  let R = T.workspaceIdentifier?.configURIPath;
  if (!R) return null;
  let a = BiT(R);
  return a ? Ai.dirname(a) : null;
}
function BiT(T) {
  try {
    return zR.parse(T).fsPath;
  } catch {
    if (Ai.isAbsolute(T)) return T;
    return null;
  }
}
async function IAR(T) {
  try {
    let R = await lk.promises.readFile(T, "utf-8"),
      a = JSON.parse(R);
    if (a.folder) return zR.parse(a.folder).fsPath;
    if (a.configuration) return Ai.dirname(zR.parse(a.configuration).fsPath);
  } catch (R) {
    J.debug("Failed to parse VS Code workspace metadata", {
      workspaceMetadataPath: T,
      error: R instanceof Error ? R.message : String(R)
    });
  }
  return null;
}
async function wg(T) {
  try {
    return await lk.promises.access(T), !0;
  } catch {
    return !1;
  }
}
async function gAR(T, R) {
  let a = await D0T("sqlite3", ["-readonly", "-json", $AR(T), R], {
    timeout: CAR
  });
  if (a.status !== 0) return J.debug("sqlite3 query failed for VS Code database", {
    status: a.status,
    stderr: a.stderr?.trim()
  }), [];
  let e = a.stdout?.trim();
  if (!e) return [];
  try {
    return JSON.parse(e).filter(t => typeof t.key === "string" && typeof t.value === "string");
  } catch (t) {
    return J.debug("Failed to parse sqlite3 JSON output for VS Code database", {
      error: t instanceof Error ? t.message : String(t)
    }), [];
  }
}
function $AR(T) {
  let R = T.replaceAll("\\", "/").split("/").map(a => encodeURIComponent(a)).join("/");
  return `file:${R.startsWith("/") ? R : `/${R}`}?immutable=1`;
}
async function vAR(T) {
  return (await jAR()).find(R => SAR(T, R.command))?.pid ?? null;
}
async function jAR() {
  let T = await D0T("ps", ["-ax", "-o", "pid=", "-o", "command="]);
  if (T.status !== 0) return [];
  return T.stdout.split(`
`).map(R => R.trim()).filter(Boolean).map(R => {
    let a = R.match(/^(\d+)\s+(.*)$/);
    if (!a) return null;
    return {
      pid: Number.parseInt(a[1] ?? "", 10),
      command: a[2] ?? ""
    };
  }).filter(R => R !== null && Number.isFinite(R.pid) && Boolean(R.command));
}
function SAR(T, R) {
  let a = R.toLowerCase();
  if (T.appPathMarkers.some(r => a.includes(r))) return !0;
  let e = a.trim().split(/\s+/)[0] ?? "",
    t = e.split("/").at(-1) ?? e;
  if (T.executableNames.includes(t)) return !0;
  return !1;
}
async function OAR() {
  return (await D0T("sqlite3", ["-version"])).status === 0;
}
async function D0T(T, R, a) {
  try {
    let {
      stdout: e,
      stderr: t
    } = await uCT(T, R, {
      encoding: "utf-8",
      timeout: a?.timeout
    });
    return {
      status: 0,
      stdout: e,
      stderr: t
    };
  } catch (e) {
    let t = e;
    return {
      status: typeof t.code === "number" ? t.code : 1,
      stdout: t.stdout ?? "",
      stderr: t.stderr ?? t.message
    };
  }
}
function dAR(T) {
  let R = T.commandCandidates.unix;
  for (let a of R) if (jD(a, ["--version"], {
    encoding: "utf-8"
  }).status === 0) return a;
  return null;
}
function bCT(T) {
  let R = process.env[T.userDataEnv];
  if (R) return R;
  return Ai.join(CiT.homedir(), "Library", "Application Support", T.userDataDirName, "User");
}
function SD(T) {
  return Ai.resolve(T).replaceAll("\\", "/").toLowerCase();
}
function yE(T) {
  return {
    connection: "query",
    ideName: T.ideName,
    listConfigs: () => cAR(T),
    readWorkspaceState: R => sAR(T, R),
    openURI: R => oAR(T, R)
  };
}
async function wAR() {
  try {
    if (!(await jCT())) return [];
    let T = (await $CT()).filter(t => vCT(t.command));
    if (T.length === 0) return [];
    if (T.some(t => H0T(t.command) !== null)) return BAR(T);
    let R = await mL();
    if (!R) return [];
    let a = T[0].pid,
      e = await ICT(R);
    return FAR(e).map(t => ({
      ...t,
      pid: a
    }));
  } catch (T) {
    return J.debug("Failed to list Zed configs", {
      error: T instanceof Error ? T.message : String(T)
    }), [];
  }
}
async function BAR(T) {
  let R = await B0T(),
    a = new Map();
  for (let e of R) {
    let t = U0T(e),
      r = T.find(i => H0T(i.command) === t);
    if (!r) continue;
    let h = await ICT(e);
    for (let i of h) {
      let c = gCT(i.paths);
      if (c.length === 0) continue;
      let s = c.join("\x00"),
        A = a.get(s);
      if (A && A.timestamp >= i.lastOpenedAt) continue;
      a.set(s, {
        config: {
          workspaceFolders: c,
          port: 0,
          ideName: "Zed",
          authToken: "",
          pid: r.pid,
          connection: "query",
          workspaceId: i.workspaceId
        },
        timestamp: i.lastOpenedAt
      });
    }
  }
  return [...a.values()].map(e => e.config);
}
async function NAR(T) {
  let R = T.workspaceId;
  if (!R) return null;
  if (!T.pid || !aO(T.pid)) return null;
  let a = await VAR(T.pid);
  if (!a || !(await jCT())) return null;
  try {
    let e = await GAR(a, R),
      t = await KAR(a, R);
    if (!e) return {
      openFiles: t.map(WW)
    };
    let r = e.bufferPath,
      h = await qAR(e.bufferPath, e.startOffset, e.endOffset);
    return {
      openFile: WW(r),
      openFiles: t.filter(i => i !== e.bufferPath).map(WW),
      selection: h
    };
  } catch (e) {
    return J.debug("Failed to read Zed workspace state", {
      error: e instanceof Error ? e.message : String(e),
      workspaceId: R
    }), null;
  }
}
function UAR(T) {
  let {
    filePath: R,
    line: a,
    column: e
  } = HAR(T);
  if (!R) return !1;
  let t = a ? `${R}:${a}${e ? `:${e}` : ""}` : R,
    r = QAR();
  if (!r) return !1;
  return fCT(r, [t], {
    stdio: "ignore"
  }).status === 0;
}
function HAR(T) {
  try {
    if (!T.startsWith("file://")) return {};
    let R = zR.parse(T),
      a = WAR(R.fragment);
    return {
      filePath: R.fsPath,
      line: a?.line,
      column: a?.column
    };
  } catch {
    return {};
  }
}
function WAR(T) {
  let R = T.match(OCT),
    a = R?.groups?.line;
  if (!a) return null;
  return {
    line: Number.parseInt(a, 10),
    column: R.groups?.column ? Number.parseInt(R.groups.column, 10) : void 0
  };
}
function WW(T) {
  return d0(zR.file(T));
}
async function qAR(T, R, a) {
  if (R === null || a === null) return;
  let e;
  try {
    e = await lN.promises.readFile(T);
  } catch (l) {
    J.debug("Failed to read Zed buffer content", {
      bufferPath: T,
      error: l instanceof Error ? l.message : String(l)
    });
    return;
  }
  let t = ziT(R, e.length),
    r = ziT(a, e.length),
    h = Math.min(t, r),
    i = Math.max(t, r),
    c = FiT(e, h),
    s = FiT(e, i),
    A = h === i ? zAR(e, h) : e.slice(h, i).toString("utf-8");
  return {
    range: {
      startLine: c.line,
      startCharacter: c.character,
      endLine: s.line,
      endCharacter: s.character
    },
    content: A
  };
}
function ziT(T, R) {
  if (T < 0) return 0;
  return Math.min(T, R);
}
function FiT(T, R) {
  let a = 0,
    e = 0,
    t = Math.min(R, T.length);
  for (let r = 0; r < t; r += 1) if (T[r] === 10) a += 1, e = r + 1;
  return {
    line: a,
    character: R - e
  };
}
function zAR(T, R) {
  let a = R,
    e = R;
  while (a > 0 && T[a - 1] !== 10) a -= 1;
  while (e < T.length && T[e] !== 10) e += 1;
  return T.slice(a, e).toString("utf-8");
}
async function ICT(T) {
  return (await w0T(T, `select workspace_id, paths, timestamp from workspaces order by timestamp desc limit ${JAR}`)).map(R => {
    let [a, e = "", t = ""] = R.split(q0T),
      r = Number.parseInt(a ?? "", 10);
    if (!Number.isFinite(r)) return null;
    return {
      workspaceId: r,
      paths: e,
      lastOpenedAt: t
    };
  }).filter(R => R !== null);
}
function FAR(T) {
  let R = [];
  for (let a of T) {
    let e = gCT(a.paths);
    if (e.length === 0) continue;
    R.push({
      workspaceFolders: e,
      port: 0,
      ideName: "Zed",
      authToken: "",
      pid: 0,
      connection: "query",
      workspaceId: a.workspaceId
    });
  }
  return R;
}
async function GAR(T, R) {
  let a = (await w0T(T, `select e.item_id, e.buffer_path, s.start, s.end from editors e join items i on e.item_id=i.item_id join panes p on i.pane_id=p.pane_id left join editor_selections s on s.editor_id=e.item_id where e.workspace_id=${R} and i.active=1 order by p.active desc limit 1`))[0];
  if (!a) return null;
  let [e, t = "", r, h] = a.split(q0T),
    i = Number.parseInt(e ?? "", 10);
  if (!t || !Number.isFinite(i)) return null;
  let c = r ? Number.parseInt(r, 10) : null,
    s = h ? Number.parseInt(h, 10) : null;
  return {
    itemId: i,
    bufferPath: t,
    startOffset: Number.isFinite(c) ? c : null,
    endOffset: Number.isFinite(s) ? s : null
  };
}
async function KAR(T, R) {
  return (await w0T(T, `select distinct e.buffer_path from editors e join items i on e.item_id=i.item_id where e.workspace_id=${R} and e.buffer_path!=''`)).filter(Boolean);
}
async function w0T(T, R) {
  let a = await W0T("sqlite3", ["-readonly", "-separator", q0T, "-noheader", T, R], {
    timeout: RpR
  });
  if (a.status !== 0) return J.debug("sqlite3 query failed for Zed database", {
    status: a.status,
    stderr: a.stderr?.trim()
  }), [];
  let e = a.stdout?.trim();
  if (!e) return [];
  return e.split(`
`).filter(Boolean);
}
function gCT(T) {
  let R = T.trim();
  if (!R) return [];
  if (R.startsWith("[")) try {
    let a = JSON.parse(R);
    if (Array.isArray(a)) return a.filter(e => typeof e === "string");
  } catch (a) {
    J.debug("Failed to parse Zed workspace JSON paths", {
      error: a instanceof Error ? a.message : String(a)
    });
  }
  return R.split(/\n|\t/).filter(Boolean);
}
async function VAR(T) {
  let R = (await $CT()).find(e => e.pid === T && vCT(e.command));
  if (!R) return mL();
  let a = H0T(R.command);
  if (!a) return mL();
  return (await B0T()).find(e => U0T(e) === a) ?? mL();
}
async function B0T() {
  let T = ZAR(),
    R = Rn.join(T, "db");
  if (!(await GiT(R))) return [];
  let a = (await lN.promises.readdir(R, {
    withFileTypes: !0
  })).filter(e => e.isDirectory()).map(e => Rn.join(R, e.name, "db.sqlite"));
  return (await Promise.all(a.map(async e => (await GiT(e)) ? e : null))).filter(e => e !== null);
}
async function mL() {
  let T = await B0T();
  if (T.length === 0) return null;
  let R = XAR();
  if (R) {
    let a = T.find(e => U0T(e) === R);
    if (a) return a;
  }
  return (await Promise.all(T.map(async a => ({
    path: a,
    mtime: (await lN.promises.stat(a)).mtimeMs
  })))).sort((a, e) => e.mtime - a.mtime)[0]?.path ?? null;
}
function XAR() {
  let T = process.env.ZED_CHANNEL?.trim().toLowerCase() ?? "";
  if (N0T(T)) return T;
  if (!YAR()) return null;
  let R = process.env.TERM_PROGRAM_VERSION?.trim().toLowerCase();
  if (!R) return null;
  for (let a of z0T) if (a !== "stable" && R.includes(a)) return a;
  return "stable";
}
function N0T(T) {
  return z0T.includes(T);
}
function YAR() {
  return process.env.TERM_PROGRAM?.toLowerCase() === "zed" || process.env.ZED_TERM === "true";
}
function U0T(T) {
  let R = Rn.basename(Rn.dirname(T)).match(/^\d+-(stable|preview|nightly|dev)$/)?.[1];
  return R && N0T(R) ? R : null;
}
async function $CT() {
  let T = await W0T("ps", ["-ax", "-o", "pid=", "-o", "comm="]);
  if (T.status !== 0) return [];
  return T.stdout.split(`
`).map(R => R.trim()).filter(Boolean).map(R => {
    let a = R.match(/^(\d+)\s+(.*)$/);
    if (!a) return null;
    return {
      pid: Number.parseInt(a[1] ?? "", 10),
      command: a[2] ?? ""
    };
  }).filter(R => R !== null && Number.isFinite(R.pid) && Boolean(R.command));
}
function vCT(T) {
  let R = T.toLowerCase();
  return /\/zed( \w+)?\.app\//.test(R) || R.endsWith(`${Rn.sep}zed`) || R.endsWith(`${Rn.sep}zed.exe`) || R === "zed" || R === "zed-editor";
}
function H0T(T) {
  let R = T.match(/\/Zed (Preview|Nightly|Dev)\.app\//i);
  if (!R) return /\/Zed\.app\//.test(T) ? "stable" : null;
  let a = R[1].toLowerCase();
  return N0T(a) ? a : null;
}
async function jCT() {
  return (await W0T("sqlite3", ["-version"])).status === 0;
}
async function GiT(T) {
  try {
    return await lN.promises.access(T), !0;
  } catch {
    return !1;
  }
}
async function W0T(T, R, a) {
  try {
    let {
      stdout: e,
      stderr: t
    } = await SCT(T, R, {
      encoding: "utf-8",
      timeout: a?.timeout
    });
    return {
      status: 0,
      stdout: e,
      stderr: t
    };
  } catch (e) {
    let t = e;
    return {
      status: typeof t.code === "number" ? t.code : 1,
      stdout: t.stdout ?? "",
      stderr: t.stderr ?? t.message
    };
  }
}
function QAR() {
  let T = ["zed", "zed-editor"];
  for (let R of T) if (fCT(R, ["--version"], {
    encoding: "utf-8"
  }).status === 0) return R;
  return null;
}
function ZAR() {
  let T = process.env[TpR];
  if (T) return T;
  return Rn.join(qiT.homedir(), "Library", "Application Support", "Zed");
}
function G0T(T) {
  let R = T.toLowerCase();
  return R.includes("intellij") || R.includes("webstorm") || R.includes("pycharm") || R.includes("goland") || R.includes("phpstorm") || R.includes("rubymine") || R.includes("clion") || R.includes("rider") || R.includes("datagrip") || R.includes("appcode") || R.includes("android studio") || R.includes("fleet") || R.includes("rustrover");
}
function AN(T) {
  let R = T.toLowerCase();
  return R.includes("vscode") || R.includes("vs code") || R.includes("cursor") || R.includes("windsurf");
}
function epR(T) {
  return T.toLowerCase().includes("neovim");
}
function tpR(T) {
  return T.toLowerCase().includes("zed");
}
function rpR(T) {
  return G0T(T);
}
function ECT(T) {
  if (epR(T)) return "Neovim";else if (tpR(T)) return "Zed";else if (G0T(T)) return "JetBrains";else if (AN(T)) return "VS Code";
}
function ipR(T) {
  return T.map(R => NCT(R)).filter(R => R !== void 0).filter(R => aO(R.pid));
}
async function OD(T) {
  let R = Oj(process.cwd()),
    a = BCT(),
    e = ipR(a).filter(h => h.connection === "query" || !AN(h.ideName)),
    t = (await Promise.all(jj.map(async h => {
      try {
        return await h.listConfigs();
      } catch (i) {
        return J.debug("Failed to list query editor configs", {
          ideName: h.ideName,
          error: i instanceof Error ? i.message : String(i)
        }), [];
      }
    }))).flat(),
    r = e.concat(t);
  if (r.sort((h, i) => cpR(h, i, R)), T?.jetbrainsOnly) r = r.filter(h => G0T(h.ideName));
  if (T?.includeAll) return r;
  return spR(r, R) ?? r.filter(h => {
    return wCT(h, R);
  });
}
function cpR(T, R, a) {
  let e = T.workspaceFolders.map(Oj),
    t = R.workspaceFolders.map(Oj),
    r = e.includes(a),
    h = t.includes(a);
  if (r && h) return T.ideName.localeCompare(R.ideName);else if (r) return -1;else if (h) return 1;
  let i = d2(e, a),
    c = d2(t, a),
    s = e[0]?.length ?? 0,
    A = t[0]?.length ?? 0;
  if (i && c) return A - s || T.ideName.localeCompare(R.ideName);else if (i) return -1;else if (c) return 1;
  return T.ideName.localeCompare(R.ideName);
}
function spR(T, R) {
  let a = T.filter(e => e.workspaceFolders.map(Oj).includes(R));
  if (a.length === 1) return a;
  if (a.length === 0) {
    let e = T.filter(t => wCT(t, R));
    if (e.length === 1) return e;
  }
  return;
}
function wCT(T, R) {
  return d2(T.workspaceFolders.map(Oj), R);
}
function d2(T, R) {
  return T.some(a => R.startsWith(a) || a.startsWith(R));
}
async function opR() {
  let T = await BCT();
  for (let R of T) {
    let a = await NCT(R);
    if (!a || a.connection !== "query" && AN(a.ideName) || !aO(a.pid)) try {
      await Sj.promises.unlink(R);
    } catch (e) {
      J.debug("Failed to remove IDE lockfile", {
        path: R,
        error: e instanceof Error ? e.message : String(e)
      });
    }
  }
}
function BCT() {
  if (!Sj.existsSync(uL)) return [];
  let T = [];
  for (let R of Sj.readdirSync(uL, {
    withFileTypes: !0
  })) if (R.isFile() && R.name.endsWith(".json")) {
    let a = DCT.join(uL, R.name);
    T.push(a);
  }
  return T;
}
function NCT(T) {
  try {
    let R = Sj.readFileSync(T, "utf-8"),
      a = LCT.safeParse(JSON.parse(R));
    if (a.success) return a.data;else J.debug("Invalid IDE config file", {
      file: T,
      errors: a.error.issues
    });
  } catch (R) {
    J.debug("Unreadable IDE config file", {
      file: T,
      error: R instanceof Error ? R.message : String(R)
    });
  }
  return;
}
function Oj(T) {
  let R;
  if (T.startsWith("file://")) R = zR.parse(T);else T = T.replaceAll("\\", "/"), R = zR.file(T);
  try {
    let e = Sj.realpathSync(R.fsPath);
    R = zR.file(e);
  } catch {}
  R = MR.resolvePath(R, ".");
  let a = R.fsPath;
  if (a = a.replaceAll("\\", "/"), a = a.toLowerCase(), !a.endsWith("/")) a += "/";
  return a;
}
class ZCT {
  _status = {};
  statusSubject = new f0(this._status);
  projectConfig;
  queryPollTimeout;
  queryPollToken = 0;
  querySource;
  ws;
  id = 1;
  reconnectTimeoutId;
  reconnectStartTime;
  isReconnecting = !1;
  connectionSource = "never-connected";
  pendingRequests = new Map();
  constructor() {
    this.statusSubject.subscribe(T => {
      if (T.ideName) {
        let R = ECT(T.ideName);
        if (R) Mg(R);
      }
    });
  }
  get status() {
    return new AR(T => {
      T.next(this._status);
      let R = this.statusSubject.subscribe(T);
      return () => R.unsubscribe();
    });
  }
  sendStatus(T) {
    this._status = {
      ...this._status,
      ...T
    }, this.statusSubject.next(this._status);
  }
  getIdeName() {
    return this._status.ideName || "ide";
  }
  async start(T, R = !1, a) {
    if (T.connection !== "query" && AN(T.ideName)) {
      this.projectConfig = void 0, this.clearReconnectTimeout(), this.ws?.close(), this.ws = void 0, this.clearPendingRequests(), this.stopQueryPolling(), this.sendStatus({
        enabled: !0,
        ideName: T.ideName,
        connected: !1,
        authenticated: !1,
        connectionState: "disconnected",
        reconnectElapsedMs: void 0,
        errorMessage: `Amp connects to ${T.ideName} through file queries, not websockets`,
        openFile: void 0,
        selections: void 0,
        visibleFiles: void 0
      });
      return;
    }
    let e = R || !this.projectConfig || this.projectConfig.port !== T.port || this.projectConfig.authToken !== T.authToken || this.projectConfig.connection !== T.connection || this.projectConfig.workspaceId !== T.workspaceId;
    if (this.projectConfig = T, this.sendStatus({
      enabled: !0
    }), this.connectionSource = a ?? "auto-startup", e && this.ws) this.ws.close(), this.ws = void 0, this.clearPendingRequests();
    this.stopQueryPolling(), await this.tryConnect(this.projectConfig);
  }
  sendRequest = (T, R) => {
    let a = this.ws;
    if (!a) return Promise.resolve(void 0);
    if (!this.isWsOpen()) return Promise.reject(Error("WebSocket is not open"));
    return new Promise((e, t) => {
      let r = `${this.id++}`,
        h = {
          clientRequest: {
            id: r,
            [T]: R
          }
        },
        i = setTimeout(() => {
          this.pendingRequests.delete(r), t(Error(`Timeout after ${ecT}ms for request ${JSON.stringify(h, null, 2)}`));
        }, ecT);
      this.pendingRequests.set(r, {
        resolve: e,
        reject: t,
        timeout: i,
        method: T
      }), a.send(JSON.stringify(h));
    });
  };
  clearPendingRequests() {
    for (let [T, R] of this.pendingRequests.entries()) clearTimeout(R.timeout), R.reject(Error("WebSocket connection closed"));
    this.pendingRequests.clear();
  }
  handleResponse(T) {
    if (!T?.id) return;
    let R = this.pendingRequests.get(T.id);
    if (!R) return;
    if (J.debug("ide-client: received response", {
      type: "response_received",
      source: this.getIdeName(),
      responseId: T?.id,
      hasError: !!T?.error
    }), clearTimeout(R.timeout), this.pendingRequests.delete(T.id), T.error) {
      R.reject(Error(JSON.stringify(T.error)));
      return;
    }
    let a = T[R.method];
    if (a) R.resolve(a);else R.reject(Error(`Invalid response for method ${R.method}. Got ${JSON.stringify(T, null, 2)}`));
  }
  async tryConnect(T) {
    if (T.connection === "query") {
      let a = this.resolveQuery(T);
      if (a) this.startQueryPolling(T, a);
      return;
    }
    if (await this.isConnected()) {
      J.debug("ide-client: already connected", {
        type: "already_connected",
        source: this.getIdeName()
      });
      return;
    }
    if (this.clearReconnectTimeout(), this.ws?.close(), this.clearPendingRequests(), !T) {
      this.sendStatus({
        connected: !1,
        authenticated: !1,
        openFile: void 0,
        selections: void 0,
        errorMessage: "IDE Not Connected"
      });
      return;
    }
    this.sendStatus({
      ideName: T.ideName
    });
    let R = new (await PpR())(`ws://localhost:${T.port}?auth=${encodeURIComponent(T.authToken)}`);
    this.ws = R, this.id = 1, R.onopen = async () => {
      try {
        if (J.info("ide-client: connected", {
          type: "connected",
          source: this.getIdeName(),
          ideName: T.ideName,
          port: T.port
        }), this.connectionSource !== "never-connected") this.connectionSource = "user-initiated";
        this.clearReconnectTimeout(), this.reconnectStartTime = void 0, this.isReconnecting = !1, this.sendStatus({
          connected: !0,
          authenticated: !0,
          connectionState: "connected",
          reconnectElapsedMs: void 0,
          errorMessage: void 0
        });
      } catch (a) {
        J.error("ide-client: connection error", a), this.sendStatus({
          connected: !1,
          authenticated: !1,
          openFile: void 0,
          selections: void 0,
          errorMessage: "IDE Not Connected"
        });
      }
    }, R.onclose = a => {
      try {
        if (this.clearPendingRequests(), a.code === 1000 && a.reason === "Authentication failed") this.sendStatus({
          connected: !1,
          authenticated: !1,
          openFile: void 0,
          selections: void 0,
          errorMessage: "IDE authentication failed - try restarting your IDE"
        });else J.warn("ide-client: disconnected", {
          code: a.code,
          reason: a.reason
        }), this.sendStatus({
          connected: !1,
          authenticated: !1,
          openFile: void 0,
          selections: void 0,
          errorMessage: "IDE Not Connected"
        });
        this.ws = void 0, this.scheduleReconnect();
      } catch (e) {
        J.error("ide-client: disconnect error", e);
      }
    }, R.onerror = () => {
      this.clearPendingRequests();
    }, R.onmessage = async a => {
      let e = a.data.toString();
      try {
        let t = CCT.safeParse(JSON.parse(e));
        if (t.error) {
          J.error("ide-client: failed to parse server message", K.prettifyError(t.error));
          return;
        }
        if (t.data?.serverResponse) this.handleResponse(t.data.serverResponse);
        this.handleNotification(t.data?.serverNotification);
      } catch (t) {
        J.error("ide-client: error handling server message", {
          error: t,
          data: e
        });
      }
    };
  }
  clearReconnectTimeout() {
    if (this.reconnectTimeoutId) clearTimeout(this.reconnectTimeoutId), this.reconnectTimeoutId = void 0;
  }
  scheduleReconnect() {
    if (this.connectionSource === "never-connected") return;
    if (this.isReconnecting) return;
    if (!this.reconnectStartTime) this.reconnectStartTime = Date.now();
    let T = Date.now() - this.reconnectStartTime;
    if (T >= xpR) {
      this.sendStatus({
        connectionState: "disconnected",
        reconnectElapsedMs: T
      });
      let R = 60000 - T;
      if (R > 0) this.clearReconnectTimeout(), this.reconnectTimeoutId = setTimeout(() => {
        let a = Date.now() - (this.reconnectStartTime || Date.now());
        this.sendStatus({
          connectionState: "disconnected",
          reconnectElapsedMs: a
        });
      }, R);
      return;
    }
    this.isReconnecting = !0, this.sendStatus({
      connectionState: "reconnecting",
      reconnectElapsedMs: T,
      ideName: this.projectConfig?.ideName
    }), this.reconnectTimeoutId = setTimeout(() => {
      this.executeReconnectAttempt().catch(R => {
        J.error("ide-client: reconnect timer failed", R);
      });
    }, kpR);
  }
  async executeReconnectAttempt() {
    try {
      if (!this.projectConfig) {
        J.debug("ide-client: no config available during reconnect, will retry");
        return;
      }
      let T = await this.resolveActiveConfig(this.projectConfig);
      this.projectConfig = T, await this.tryConnect(T);
    } catch (T) {
      J.error("ide-client: reconnect loop error", T);
    } finally {
      this.handleReconnectResult(await this.isConnected());
    }
  }
  async resolveActiveConfig(T) {
    if (T.connection === "query") {
      let {
        config: R
      } = await this.findQueryConfig(T);
      return R ?? T;
    }
    if (aO(T.pid)) return T;
    return (await OD()).find(R => R.ideName === T.ideName && R.workspaceFolders.length === T.workspaceFolders.length && R.workspaceFolders.every(a => T.workspaceFolders.includes(a))) ?? T;
  }
  handleReconnectResult(T) {
    if (this.isReconnecting = !1, !T) this.scheduleReconnect();else this.clearReconnectTimeout(), this.reconnectStartTime = void 0, this.sendStatus({
      connectionState: "connected",
      reconnectElapsedMs: void 0
    });
  }
  startQueryPolling(T, R) {
    this.stopQueryPolling();
    let a = ++this.queryPollToken;
    this.querySource = {
      config: T,
      query: R
    }, this.sendStatus({
      ideName: R.ideName,
      workspace: T.workspaceFolders[0],
      connected: !0,
      authenticated: !0,
      connectionState: "connected",
      reconnectElapsedMs: void 0,
      errorMessage: void 0
    });
    let e = async () => {
      if (a !== this.queryPollToken) return;
      let t;
      try {
        t = await R.readWorkspaceState(T);
      } catch (r) {
        J.warn("ide-client: query poll failed", {
          ideName: R.ideName,
          error: r
        }), t = null;
      }
      if (a !== this.queryPollToken) return;
      if (!t) {
        this.sendStatus({
          connected: !1,
          authenticated: !1,
          connectionState: "disconnected",
          errorMessage: `${R.ideName} Not Connected`,
          openFile: void 0,
          selections: void 0,
          visibleFiles: void 0
        }), this.stopQueryPolling(), this.scheduleReconnect();
        return;
      }
      this.sendStatus({
        connected: !0,
        authenticated: !0,
        connectionState: "connected",
        openFile: t.openFile,
        selections: t.selection ? [t.selection] : void 0,
        visibleFiles: t.openFiles
      }), this.queryPollTimeout = setTimeout(() => {
        e();
      }, fpR);
    };
    e();
  }
  stopQueryPolling() {
    if (this.queryPollToken += 1, this.queryPollTimeout) clearTimeout(this.queryPollTimeout), this.queryPollTimeout = void 0;
  }
  isWsOpen() {
    return this.ws?.readyState === 1;
  }
  async isConnected() {
    if (this.projectConfig?.connection === "query") return this._status.connected === !0;
    if (!this._status.authenticated) return !1;
    if (!this.isWsOpen()) return !1;
    try {
      return (await this.sendRequest("ping", {
        message: "beepboop"
      }))?.message === "beepboop";
    } catch (T) {
      return J.debug("isConnected ping failed", {
        error: T
      }), !1;
    }
  }
  async requestDiagnosticsFromIDE(T) {
    try {
      return await this.sendRequest("getDiagnostics", {
        path: T
      });
    } catch (R) {
      J.debug("ide-diags: failed to request diagnostics from IDE", {
        error: R,
        path: T
      });
      return;
    }
  }
  async openURIInIDE(T) {
    if (this.projectConfig?.connection === "query") return this.querySource?.query.openURI(T);
    if (!this.isWsOpen()) return;
    try {
      let R = await this.sendRequest("openURI", {
        uri: T
      });
      if (!R) return !1;
      return !!R.success;
    } catch (R) {
      return J.debug("ide-client: openURI request failed", {
        error: R,
        uri: T
      }), !1;
    }
  }
  handleNotification(T) {
    if (!T) return;
    if (T.selectionDidChange) this.sendStatus({
      selections: T.selectionDidChange.selections,
      openFile: T.selectionDidChange.uri
    });else if (T.visibleFilesDidChange) {
      let R = T.visibleFilesDidChange.uris;
      this.sendStatus({
        visibleFiles: R,
        ...(R.length === 0 && {
          openFile: void 0,
          selections: void 0
        })
      });
    } else if (T.pluginMetadata) this.sendStatus({
      pluginVersion: T.pluginMetadata.version,
      pluginDirectory: T.pluginMetadata.pluginDirectory
    });
  }
  async findQueryConfig(T) {
    let R = (T.workspaceId ? T : (await this.listQueryConfigs()).find(e => e.workspaceFolders.every(t => T.workspaceFolders.includes(t)))) ?? (await OD({
      includeAll: !0
    })).find(e => e.connection === "query" && e.workspaceId === T.workspaceId);
    if (!R) return {};
    let a = this.resolveQuery(R);
    if (!a) return {
      config: R
    };
    return {
      query: a,
      config: R
    };
  }
  async listQueryConfigs() {
    return (await Promise.all(jj.map(async T => {
      try {
        return await T.listConfigs();
      } catch (R) {
        return J.debug("ide-client: failed to list query configs", {
          ideName: T.ideName,
          error: R
        }), [];
      }
    }))).flat();
  }
  resolveQuery(T) {
    return jj.find(R => R.ideName === T.ideName);
  }
  selectConfig(T) {
    this.projectConfig = T;
  }
  getSelectedConfig() {
    return this.projectConfig;
  }
}
async function PpR() {
  if (typeof WebSocket < "u") return WebSocket;
  let {
    default: T
  } = await Promise.resolve().then(() => (Q0T(), Y0T));
  return T;
}
function gpR(T) {
  return _N(T);
}
function $pR(T) {
  return T.replace(/[^a-zA-Z0-9_-]/g, "_");
}
function _N(T) {
  return T9T.join(R9T, `${$pR(T)}.lock`);
}
async function vpR() {
  await $r.mkdir(R9T, {
    recursive: !0,
    mode: 448
  });
}
function jpR(T) {
  try {
    return process.kill(T, 0), !0;
  } catch {
    return !1;
  }
}
function zW(T) {
  if (Date.now() - T.timestamp > SpR) return !0;
  let R = qT("node:os").hostname();
  if (T.hostname === R && !jpR(T.pid)) return !0;
  return !1;
}
async function yL(T) {
  let R = _N(T);
  try {
    let a = await $r.readFile(R, "utf8"),
      e = JSON.parse(a);
    if (typeof e.pid !== "number" || typeof e.timestamp !== "number") return J.warn("Invalid lock file structure, treating as stale", {
      serverName: T,
      lockPath: R
    }), null;
    return e;
  } catch (a) {
    if (a?.code === "ENOENT") return null;
    return J.debug("Failed to read lock file", {
      serverName: T,
      error: a.message
    }), null;
  }
}
async function dj(T) {
  await vpR();
  let R = _N(T),
    a = await yL(T);
  if (a) if (zW(a)) {
    J.info("Removing stale OAuth lock", {
      serverName: T,
      stalePid: a.pid,
      ageMs: Date.now() - a.timestamp
    });
    try {
      await $r.unlink(R);
    } catch {}
  } else return J.debug("OAuth lock held by another process", {
    serverName: T,
    holderPid: a.pid,
    ageMs: Date.now() - a.timestamp
  }), {
    acquired: !1,
    holder: a
  };
  let e = {
      pid: process.pid,
      timestamp: Date.now(),
      hostname: qT("node:os").hostname()
    },
    t = JSON.stringify(e),
    r = `${R}.${process.pid}.${IpR(4).toString("hex")}`;
  try {
    let h = await $r.open(r, "wx", 384);
    try {
      await h.writeFile(t), await h.sync();
    } finally {
      await h.close();
    }
    try {
      return await $r.link(r, R), await $r.unlink(r).catch(() => {}), J.info("Acquired OAuth lock", {
        serverName: T,
        pid: process.pid
      }), {
        acquired: !0
      };
    } catch (i) {
      if (await $r.unlink(r).catch(() => {}), i?.code === "EEXIST") {
        let c = await yL(T);
        if (c && !zW(c)) return J.debug("Lost OAuth lock race to another process", {
          serverName: T,
          winnerPid: c.pid
        }), {
          acquired: !1,
          holder: c
        };
        return dj(T);
      }
      throw i;
    }
  } catch (h) {
    if (await $r.unlink(r).catch(() => {}), h?.code === "EEXIST") {
      let i = await yL(T);
      if (i && !zW(i)) return {
        acquired: !1,
        holder: i
      };
      return dj(T);
    }
    throw J.error("Failed to acquire OAuth lock", {
      serverName: T,
      error: h.message
    }), h;
  }
}
async function ED(T) {
  let R = _N(T);
  try {
    let a = await yL(T);
    if (!a) {
      J.debug("No lock to release", {
        serverName: T
      });
      return;
    }
    if (a.pid !== process.pid) {
      J.warn("Cannot release lock owned by another process", {
        serverName: T,
        ownerPid: a.pid,
        ourPid: process.pid
      });
      return;
    }
    await $r.unlink(R), J.info("Released OAuth lock", {
      serverName: T,
      pid: process.pid
    });
  } catch (a) {
    if (a?.code === "ENOENT") return;
    J.error("Failed to release OAuth lock", {
      serverName: T,
      error: a.message
    });
  }
}
function OpR(T) {
  return T.replace(/ /g, "\\ ");
}
function h4T(T) {
  let R = T;
  if (R.startsWith("~/")) {
    let a = process.env.HOME || process.env.USERPROFILE || "";
    R = R.replace("~/", `${a}/`);
  } else if (R === "~") R = process.env.HOME || process.env.USERPROFILE || "";
  if (R = R.replace(/%([^%]+)%/g, (a, e) => {
    return process.env[e] || `%${e}%`;
  }), R.includes("%USERPROFILE%") && process.env.USERPROFILE) R = R.replace(/%USERPROFILE%/g, process.env.USERPROFILE);
  return zR.file(R);
}
function E2(T, R) {
  let a = h4T(R);
  if (a.path.includes("*")) {
    let e = T.toString(),
      t = a.path;
    if (!t.startsWith("file://")) {
      if (!t.startsWith("/")) t = `/${t}`;
      t = `file://${t}`;
    }
    let r = t.replace(/\./g, "\\.").replace(/\*\*/g, "\xA7DOUBLESTAR\xA7").replace(/\*/g, "[^/]*").replace(/\u00A7DOUBLESTAR\u00A7/g, ".*");
    return new RegExp(`^${r}$`, "i").test(e);
  } else return a.toString().toLowerCase() === T.toString().toLowerCase();
}
function tcT(T, R) {
  return R.some(a => E2(T, a));
}
async function LpR(T, R) {
  try {
    return await R.realpath(T);
  } catch {}
  let a = [],
    e = T;
  while (!0) {
    let t = MR.dirname(e);
    if (t.toString() === e.toString()) break;
    a.unshift(MR.basename(e)), e = t;
    try {
      let r = await R.realpath(e);
      for (let h of a) r = MR.joinPath(r, h);
      return r;
    } catch {}
  }
  return T;
}
async function MpR(T, R, a) {
  try {
    let e = await LpR(T, R),
      t = ["~/.config/AGENT.md", ...a];
    for (let r of t) if (E2(e, r) || E2(T, r)) return null;
    for (let {
      key: r,
      pattern: h
    } of a9T) if (tcT(e, h.patterns) || tcT(T, h.patterns)) return {
      key: r,
      pattern: h
    };
    return null;
  } catch {
    return null;
  }
}
async function rcT(T, R, a) {
  if (a?.dangerouslyAllowAll ?? !1) return {
    requiresConsent: !1
  };
  try {
    let e = await MpR(T, R, a["guardedFiles.allowlist"] ?? []);
    if (e) return {
      requiresConsent: !0,
      reason: `${e.pattern.description}`,
      toAllow: T.fsPath
    };
    return {
      requiresConsent: !1
    };
  } catch {
    return {
      requiresConsent: !0,
      reason: "Unable to resolve file path",
      toAllow: T.fsPath
    };
  }
}
function DpR() {
  if (js.size === 0) return;
  J.info("Killing all child processes");
  for (let T of js) t9T(T);
  js.clear(), J.info("All child processes killed");
}
function t9T(T) {
  if (!T.pid) {
    try {
      T.kill("SIGKILL");
    } catch (R) {
      J.error("Failed to kill process without PID", R);
    }
    return;
  }
  if (Bg.has(T.pid)) {
    J.debug(`Process ${T.pid} already being killed, skipping`);
    return;
  }
  Bg.add(T.pid);
  try {
    try {
      process.kill(T.pid, 0), process.kill(-T.pid, "SIGKILL");
    } catch (R) {
      J.debug(`Process ${T.pid} no longer exists, skipping kill`);
    }
    Bg.delete(T.pid);
  } catch (R) {
    J.error(`Failed to kill process ${T.pid}`, R), Bg.delete(T.pid);
  }
}
function hcT(T) {
  t9T(T), js.delete(T);
}
function wpR(T) {
  js.add(T);
}
function BpR(T) {
  let R = {
    ...T,
    detached: !0,
    env: {
      ...process.env,
      ...(T?.env || {}),
      NONINTERACTIVE: "1",
      DEBIAN_FRONTEND: "noninteractive"
    }
  };
  if (!R.stdio) R.stdio = ["pipe", "pipe", "pipe"];
  return R;
}
function i4T(...T) {
  return new AR(R => {
    let a = !1,
      e,
      t = !1;
    return (async () => {
      try {
        let {
          spawn: r
        } = await import("child_process");
        if (a) return;
        e = r(T[0], T[1], BpR(T[2])), js.add(e), e.on("spawn", () => {
          R.next({
            type: "spawn",
            pid: e?.pid,
            process: e
          });
        }), e.stdout?.on("data", h => {
          if (a || t) return;
          R.next({
            type: "data",
            stream: "stdout",
            chunk: Buffer.isBuffer(h) ? h : Buffer.from(String(h)),
            pid: e?.pid,
            process: e
          });
        }), e.stderr?.on("data", h => {
          if (a || t) return;
          R.next({
            type: "data",
            stream: "stderr",
            chunk: Buffer.isBuffer(h) ? h : Buffer.from(String(h)),
            pid: e?.pid,
            process: e
          });
        }), e.on("exit", h => {
          if (a || t) return;
          R.next({
            type: "exit",
            exitCode: h
          });
        }), e.on("close", h => {
          if (a) return;
          if (t) return;
          if (t = !0, R.next({
            type: "close",
            exitCode: h
          }), R.complete(), e) js.delete(e);
        }), e.on("error", h => {
          if (a || t) return;
          if (t = !0, R.error(h), e) js.delete(e);
        });
      } catch (r) {
        if (a) return;
        R.error(r);
      }
    })(), () => {
      if (a = !0, e && !t) t9T(e), js.delete(e);
    };
  });
}
function Ej(...T) {
  return new AR(R => {
    let a = {
        stdout: "",
        stderr: "",
        combinedOutput: "",
        exitCode: null,
        exited: !1
      },
      e = i4T(...T).subscribe({
        next: t => {
          switch (t.type) {
            case "spawn":
              a.pid = t.pid, a.process = t.process, R.next({
                ...a,
                process: t.process
              });
              break;
            case "data":
              {
                let r = t.chunk.toString();
                if (t.stream === "stdout") a.stdout += r;else a.stderr += r;
                a.combinedOutput += r, a.lastData = t.chunk, R.next({
                  ...a,
                  process: t.process ?? a.process
                });
                break;
              }
            case "exit":
              a.exitCode = t.exitCode ?? -1, a.exited = !0;
              break;
            case "close":
              if (a.exitCode === null) a.exitCode = t.exitCode ?? -1;
              a.exited = !0, a.lastData = void 0, R.next({
                ...a,
                process: a.process
              }), R.complete();
              break;
          }
        },
        error: t => R.error(t)
      });
    return () => e.unsubscribe();
  });
}
function c4T(T) {
  if (typeof T !== "string") throw Error("arg is not a string");
  if (T.startsWith("-")) throw Error("arg is not safe");
}
function uN(T) {
  if (!T) throw Error("tool requires a working directory");
  if (T.scheme !== "file") throw Error(`tool requires a dir with a file: URI (got ${JSON.stringify(T.scheme)})`);
}
function Cj(T, R) {
  if (R === "") return !1;
  let a = T.toLowerCase(),
    e = R.toLowerCase();
  if (e.length === 1) {
    if (e === "*") return !0;
    return e === a;
  }
  if (a === e) return !0;
  if (e.includes("*") || e.includes("?") || e.includes("[") || e.includes("{")) try {
    return s4T.default(e, {
      dot: !0
    })(a);
  } catch (t) {
    return !1;
  }
  return !1;
}
function C2(T, R) {
  let a = R.split("."),
    e = T;
  for (let t of a) {
    if (e === null || e === void 0) return;
    if (Array.isArray(e)) {
      let r = parseInt(t, 10);
      if (isNaN(r) || r < 0 || r >= e.length) return;
      e = e[r];
    } else if (typeof e === "object") e = e[t];else return;
  }
  return e;
}
function NpR(T, R, a, e) {
  if (!Cj(R, T.tool)) return !1;
  if (T.context && T.context !== e) return !1;
  if (!T.matches || Object.keys(T.matches).length === 0) return !0;
  return Object.entries(T.matches).every(([t, r]) => {
    if (r === void 0) {
      if (t.includes(".")) return C2(a, t) === void 0;
      return t in a && a[t] === void 0;
    }
    let h = t.includes(".") ? C2(a, t) : a[t];
    return r9T(h, r);
  });
}
async function UpR(T, R, a, e, t, r) {
  if (T.action !== "delegate") {
    if (T.action === "reject" && T.message) return {
      action: T.action,
      matchedEntry: T,
      error: T.message
    };
    return {
      action: T.action,
      matchedEntry: T
    };
  }
  if (!a || !T.to) return {
    action: null,
    matchedEntry: T,
    error: "No spawn function provided"
  };
  try {
    let h = await HpR(T.to, R, a, e, t, r);
    return WpR(h, T);
  } catch (h) {
    return {
      action: "reject",
      error: h instanceof Error ? h.message : "Unknown error",
      matchedEntry: T
    };
  }
}
async function HpR(T, R, a, e, t, r) {
  let h = {
    AGENT: "amp"
  };
  if (e) h.AMP_THREAD_ID = e;
  if (t) h.AGENT_TOOL_NAME = t;
  if (r) h.AGENT_TOOL_USE_ID = r;
  let i = T.includes("~") || T.includes("%") ? h4T(T).path : T,
    c = a(i, [], {
      env: h
    });
  return new Promise((s, A) => {
    let l;
    c.subscribe({
      next: o => {
        if (typeof o === "object" && o !== null && "status" in o && o.status === "error") {
          A(Error("Delegate command timed out after 10 seconds"));
          return;
        }
        if (o.process && !o.exited) o.process.stdin?.write(JSON.stringify(R)), o.process.stdin?.end();
        l = o;
      },
      complete: () => {
        if (l?.exited) s({
          exitCode: l.exitCode ?? -1,
          stdout: l.stdout,
          stderr: l.stderr
        });else A(Error("Process did not exit properly"));
      },
      error: o => {
        A(o);
      }
    });
  });
}
function WpR({
  exitCode: T,
  stderr: R
}, a) {
  switch (T) {
    case 0:
      return {
        action: "allow",
        matchedEntry: a
      };
    case 1:
      return {
        action: "ask",
        matchedEntry: a
      };
    default:
      return {
        action: "reject",
        matchedEntry: a,
        error: R
      };
  }
}
async function CD(T, R, a, e, t, r, h, i) {
  let c = 0;
  for (let s of a) try {
    if (!NpR(s, T, R, e)) {
      c = c + 1;
      continue;
    }
    let A = await UpR(s, R, t, r, T, i);
    if (A.matchIndex = c, h) A.source = h;
    return A;
  } catch (A) {
    return {
      action: null,
      error: A instanceof Error ? A.message : "Unknown error"
    };
  }
  return {
    action: null
  };
}
function r9T(T, R) {
  if (typeof R === "string") {
    if (typeof T !== "string") return !1;
    return zpR(T, R);
  }
  if (Array.isArray(R)) return R.some(a => {
    if (typeof a === "string") return typeof T === "string" && L2(T, a);
    return T === a;
  });
  if (typeof R === "object" && R !== null) return qpR(T, R);
  return T === R;
}
function qpR(T, R) {
  if (Object.keys(R).length === 0) return typeof T === "object" && T !== null;
  if (typeof T !== "object" || T === null) return !1;
  for (let [a, e] of Object.entries(R)) {
    let t = C2(T, a);
    if (!r9T(t, e)) return !1;
  }
  return !0;
}
function zpR(T, R) {
  if (typeof R === "string") return L2(T, R);
  if (Array.isArray(R)) return R.some(a => typeof a === "string" && L2(T, a));
  return !1;
}
function L2(T, R) {
  if (R.length >= 3 && R.startsWith("/") && R.endsWith("/")) try {
    let e = R.slice(1, -1);
    return new RegExp(e, "m").test(T);
  } catch (e) {
    throw Error(`Invalid regex pattern: ${R}`);
  }
  if (R === "*") return !0;
  if (!R.includes("*")) return T === R;
  let a = R.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${a}$`, "m").test(T);
}
function MD(T, R) {
  if (T === R) return !0;
  if (T == null || R == null || typeof T !== "object" || typeof R !== "object") return !1;
  let a = Array.isArray(T),
    e = Array.isArray(R);
  if (a !== e) return !1;
  if (a && e) return T.length === R.length && T.every((r, h) => MD(r, R[h]));
  let t = new Set([...Object.keys(T), ...Object.keys(R)]);
  for (let r of t) if (!MD(T[r], R[r])) return !1;
  return !0;
}
function yu(T) {
  let R = T.length;
  while (--R >= 0) T[R] = 0;
}
function GW(T, R, a, e, t) {
  this.static_tree = T, this.extra_bits = R, this.extra_base = a, this.elems = e, this.max_length = t, this.has_stree = T && T.length;
}
function KW(T, R) {
  this.dyn_tree = T, this.max_code = 0, this.stat_desc = R;
}
function Gc(T, R, a, e, t) {
  this.good_length = T, this.max_lazy = R, this.nice_length = a, this.max_chain = e, this.func = t;
}
function FpR() {
  this.strm = null, this.status = 0, this.pending_buf = null, this.pending_buf_size = 0, this.pending_out = 0, this.pending = 0, this.wrap = 0, this.gzhead = null, this.gzindex = 0, this.method = iO, this.last_flush = -1, this.w_size = 0, this.w_bits = 0, this.w_mask = 0, this.window = null, this.window_size = 0, this.prev = null, this.head = null, this.ins_h = 0, this.hash_size = 0, this.hash_bits = 0, this.hash_mask = 0, this.hash_shift = 0, this.block_start = 0, this.match_length = 0, this.prev_match = 0, this.match_available = 0, this.strstart = 0, this.match_start = 0, this.lookahead = 0, this.prev_length = 0, this.max_chain_length = 0, this.max_lazy_match = 0, this.level = 0, this.strategy = 0, this.good_match = 0, this.nice_match = 0, this.dyn_ltree = new Uint16Array(w4T * 2), this.dyn_dtree = new Uint16Array((2 * x_R + 1) * 2), this.bl_tree = new Uint16Array((2 * f_R + 1) * 2), Cl(this.dyn_ltree), Cl(this.dyn_dtree), Cl(this.bl_tree), this.l_desc = null, this.d_desc = null, this.bl_desc = null, this.bl_count = new Uint16Array(I_R + 1), this.heap = new Uint16Array(2 * ND + 1), Cl(this.heap), this.heap_len = 0, this.heap_max = 0, this.depth = new Uint16Array(2 * ND + 1), Cl(this.depth), this.sym_buf = 0, this.lit_bufsize = 0, this.sym_next = 0, this.sym_end = 0, this.opt_len = 0, this.static_len = 0, this.matches = 0, this.insert = 0, this.bi_buf = 0, this.bi_valid = 0;
}
function GpR() {
  this.input = null, this.next_in = 0, this.avail_in = 0, this.total_in = 0, this.output = null, this.next_out = 0, this.avail_out = 0, this.total_out = 0, this.msg = "", this.state = null, this.data_type = 2, this.adler = 0;
}
function Ng(T) {
  this.options = N$.assign({
    level: z4T,
    method: G4T,
    chunkSize: 16384,
    windowBits: 15,
    memLevel: 8,
    strategy: F4T
  }, T || {});
  let R = this.options;
  if (R.raw && R.windowBits > 0) R.windowBits = -R.windowBits;else if (R.gzip && R.windowBits > 0 && R.windowBits < 16) R.windowBits += 16;
  this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new l9T(), this.strm.avail_out = 0;
  let a = IP.deflateInit2(this.strm, R.level, R.method, R.windowBits, R.memLevel, R.strategy);
  if (a !== U$) throw Error(xA[a]);
  if (R.header) IP.deflateSetHeader(this.strm, R.header);
  if (R.dictionary) {
    let e;
    if (typeof R.dictionary === "string") e = Xy.string2buf(R.dictionary);else if (F2.call(R.dictionary) === "[object ArrayBuffer]") e = new Uint8Array(R.dictionary);else e = R.dictionary;
    if (a = IP.deflateSetDictionary(this.strm, e), a !== U$) throw Error(xA[a]);
    this._dict_set = !0;
  }
}
function h9T(T, R) {
  let a = new Ng(R);
  if (a.push(T, !0), a.err) throw a.msg || xA[a.err];
  return a.result;
}
function KpR(T, R) {
  return R = R || {}, R.raw = !0, h9T(T, R);
}
function VpR(T, R) {
  return R = R || {}, R.gzip = !0, h9T(T, R);
}
function XpR() {
  this.strm = null, this.mode = 0, this.last = !1, this.wrap = 0, this.havedict = !1, this.flags = 0, this.dmax = 0, this.check = 0, this.total = 0, this.head = null, this.wbits = 0, this.wsize = 0, this.whave = 0, this.wnext = 0, this.window = null, this.hold = 0, this.bits = 0, this.length = 0, this.offset = 0, this.extra = 0, this.lencode = null, this.distcode = null, this.lenbits = 0, this.distbits = 0, this.ncode = 0, this.nlen = 0, this.ndist = 0, this.have = 0, this.next = null, this.lens = new Uint16Array(320), this.work = new Uint16Array(288), this.lendyn = null, this.distdyn = null, this.sane = 0, this.back = 0, this.was = 0;
}
function YpR() {
  this.text = 0, this.time = 0, this.xflags = 0, this.os = 0, this.extra = null, this.extra_len = 0, this.name = "", this.comment = "", this.hcrc = 0, this.done = !1;
}
function Ug(T) {
  this.options = N$.assign({
    chunkSize: 65536,
    windowBits: 15,
    to: ""
  }, T || {});
  let R = this.options;
  if (R.raw && R.windowBits >= 0 && R.windowBits < 16) {
    if (R.windowBits = -R.windowBits, R.windowBits === 0) R.windowBits = -15;
  }
  if (R.windowBits >= 0 && R.windowBits < 16 && !(T && T.windowBits)) R.windowBits += 32;
  if (R.windowBits > 15 && R.windowBits < 48) {
    if ((R.windowBits & 15) === 0) R.windowBits |= 15;
  }
  this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new l9T(), this.strm.avail_out = 0;
  let a = ns.inflateInit2(this.strm, R.windowBits);
  if (a !== Yy) throw Error(xA[a]);
  if (this.header = new nLT(), ns.inflateGetHeader(this.strm, this.header), R.dictionary) {
    if (typeof R.dictionary === "string") R.dictionary = Xy.string2buf(R.dictionary);else if (V2.call(R.dictionary) === "[object ArrayBuffer]") R.dictionary = new Uint8Array(R.dictionary);
    if (R.raw) {
      if (a = ns.inflateSetDictionary(this.strm, R.dictionary), a !== Yy) throw Error(xA[a]);
    }
  }
}
function M2(T, R) {
  let a = new Ug(R);
  if (a.push(T), a.err) throw a.msg || xA[a.err];
  return a.result;
}
function QpR(T, R) {
  return R = R || {}, R.raw = !0, M2(T, R);
}
function hbR(T) {
  if (T.proxy && !process.env.HTTP_PROXY && !process.env.http_proxy) process.env.HTTP_PROXY = T.proxy;
  if (T.proxy && !process.env.HTTPS_PROXY && !process.env.https_proxy) process.env.HTTPS_PROXY = T.proxy;
}
function $P(T, R, a) {
  let e = a ? `/threads/${R}/${a}` : `/threads/${R}`;
  return new URL(e, T);
}
async function fi(T, R, a) {
  let e = await a.getLatest(R?.signal ?? void 0),
    t = await ALT(T, R, e);
  return fetch(t);
}
async function ibR(T, R, a) {
  let e = await ALT(R, a, T);
  return fetch(e);
}
async function ALT(T, R, a) {
  if (T.startsWith("http:") || T.startsWith("https:")) throw Error("input must be a path, not an absolute URL");
  if (!T.startsWith("/")) throw Error("pathAndQuery must start with /");
  let e = a.settings.url;
  if (!e) throw Error("amp.url is not set");
  let t = await a.secrets.getToken("apiKey", e);
  hbR({
    proxy: a.settings.proxy
  });
  let r = new URL(T, e);
  return new Request(r, {
    ...R,
    duplex: "half",
    headers: {
      "Content-Type": "application/json",
      ...R?.headers,
      ...Xs(),
      ...(t ? {
        Authorization: `Bearer ${t}`
      } : {})
    }
  });
}
async function cbR(T, R, a, e, t) {
  let r = await T.get(R);
  if (!r) throw Error(`Thread not found: ${R}`);
  let h = await N3.shareThreadWithOperator({
    threadData: r,
    message: e || void 0,
    ephemeralError: t || void 0
  }, {
    config: a
  });
  if (!h.ok) throw Error(`Failed to share thread: ${h.error.message}`);
}
async function pLT(T, R) {
  let a = await fi("/api/telemetry", {
    method: "POST",
    redirect: "manual",
    body: T
  }, R);
  if (!a.ok) {
    let e = await a.text(),
      t;
    try {
      t = JSON.parse(e).error || `HTTP ${a.status}`;
    } catch {
      t = e || `HTTP ${a.status}`;
    }
    throw Error(`Failed to submit telemetry: ${t}`);
  }
}
function sbR(T) {
  if (new Blob([T]).size <= nbR) return {
    body: T
  };
  return {
    body: lLT.gzip(T),
    headers: {
      "Content-Encoding": "gzip"
    }
  };
}
function obR() {
  return new Proxy({}, {
    get: (T, R) => {
      return async (...a) => {
        let e = a.at(1),
          t = a.at(0);
        if (!e?.config) throw Error("Internal API client requires configService in options. Call with { config: configService }");
        let {
            body: r,
            headers: h = {}
          } = sbR(JSON.stringify({
            method: R,
            params: t
          })),
          i = await fi("/api/internal?" + encodeURIComponent(R), {
            method: "POST",
            body: r,
            headers: h,
            signal: e?.signal
          }, e.config);
        if (!i.ok) throw Error(`API request for ${R} failed: ${i.status}`);
        return await i.json();
      };
    }
  });
}
function lbR(T) {
  return T.config.pipe(JR(({
    settings: R,
    secrets: a
  }) => ({
    url: R.url,
    proxy: R.proxy,
    secrets: a
  })), E9(MD), L9(R => hET(600000).pipe(Y3(void 0), f0T(() => Q9(async a => {
    let e = await N3.getUserInfo({}, {
      signal: a,
      config: T
    });
    if (e.ok) return e.result;
    if (e.error && e.error.code === "auth-required") return null;
    throw J.error("getUserInfo failed", {
      error: e.error
    }), Error(`getUserInfo error: ${e.error.code}`);
  })))), JR(R => {
    return R instanceof Error ? {
      error: {
        message: String(R)
      }
    } : R === Jo ? "pending" : R ? {
      user: R,
      features: R.features,
      workspace: R?.team,
      mysteriousMessage: R?.mysteriousMessage
    } : {
      error: {
        message: "User not found"
      }
    };
  }), E9((R, a) => MD(R, a)), f3({
    shouldCountRefs: !0
  }));
}
function ln(T) {
  let R = X2.get(T);
  if (R) return R;
  let a = lbR(T);
  return X2.set(T, a), a;
}
function X9(T) {
  return Boolean(typeof T === "object" && "user" in T && T.user);
}
function oA(T) {
  return typeof T === "object" && "error" in T;
}
function tq(T, R, a) {
  if (T.startsWith("mcp__")) return R.allowMcp ?? !1;
  if (T.startsWith("tb__")) {
    if (!(R.allowToolbox ?? !1)) return !1;
    let e = "subagentType" in R ? R.subagentType : void 0;
    if (e && a) {
      if (!a.subagentTypes) return !1;
      return a.subagentTypes.includes("all") || a.subagentTypes.includes(e);
    }
    return !0;
  }
  return R.includeTools.includes(T);
}
function pbR(T, R) {
  return new AR(a => {
    let e = setTimeout(t, R);
    function t() {
      a.error(Error(`Tool execution timed out after ${R / 1000} seconds`));
    }
    function r() {
      if (e) clearTimeout(e);
      e = setTimeout(t, R);
    }
    let h = T.subscribe({
      next: i => {
        r(), a.next(i);
      },
      error: i => {
        if (e) clearTimeout(e), e = null;
        a.error(i);
      },
      complete: () => {
        if (e) clearTimeout(e), e = null;
        a.complete();
      }
    });
    return () => {
      if (e) clearTimeout(e), e = null;
      h.unsubscribe();
    };
  });
}
function ZsT(T) {
  return {
    tool: T,
    action: "allow"
  };
}
function bbR(T) {
  if (!T || !("cmd" in T)) return T;
  let {
    cmd: R,
    ...a
  } = T;
  return {
    ...a,
    command: R
  };
}
function mbR(T) {
  return T.flatMap(R => {
    if (R.tool !== U8) return [];
    return [{
      ...R,
      tool: Eb,
      matches: bbR(R.matches)
    }];
  });
}
class bLT {
  input;
  position = 0;
  line = 1;
  column = 1;
  tokens = [];
  constructor(T) {
    this.input = T;
  }
  current() {
    return this.position < this.input.length ? this.input[this.position] : "";
  }
  peek() {
    return this.position + 1 < this.input.length ? this.input[this.position + 1] : "";
  }
  advance() {
    let T = this.current();
    if (this.position++, T === `
`) this.line++, this.column = 1;else this.column++;
    return T;
  }
  skipWhitespace() {
    while (this.current() && /\s/.test(this.current()) && this.current() !== `
`) this.advance();
  }
  readString() {
    let T = "",
      R = this.current();
    this.advance();
    while (this.current() && this.current() !== R) if (this.current() === "\\" && this.peek() === R) this.advance(), T += this.advance();else T += this.advance();
    if (!this.current()) throw Error("Unterminated string");
    return this.advance(), T;
  }
  readIdentifier() {
    let T = "";
    if (this.current() === "-" && /\d/.test(this.peek())) T += this.advance();
    while (this.current() && /[a-zA-Z0-9_*.-]/.test(this.current())) T += this.advance();
    if ((this.current() === "e" || this.current() === "E") && /[-+]?\d/.test(this.peek())) {
      if (T += this.advance(), this.current() === "+" || this.current() === "-") T += this.advance();
      while (this.current() && /\d/.test(this.current())) T += this.advance();
    }
    return T;
  }
  readFlag() {
    let T = "";
    this.advance(), this.advance();
    while (this.current() && /[a-zA-Z0-9_*:.-]/.test(this.current())) T += this.advance();
    return T;
  }
  readComment() {
    let T = "";
    this.advance();
    while (this.current() && this.current() !== `
`) T += this.advance();
    return T.trim();
  }
  tokenize() {
    this.tokens = [];
    while (this.position < this.input.length) {
      let T = {
        position: this.position,
        line: this.line,
        column: this.column
      };
      if (this.skipWhitespace(), !this.current()) break;
      if (this.current() === "'" || this.current() === '"') {
        try {
          let R = this.readString();
          this.tokens.push({
            type: "STRING",
            value: R,
            ...T
          });
        } catch (R) {
          throw Error(`Parse error at line ${this.line}, column ${this.column}: ${R}`);
        }
        continue;
      }
      if (this.current() === `
`) {
        this.advance();
        continue;
      }
      if (this.current() === "#") {
        let R = this.readComment();
        this.tokens.push({
          type: "COMMENT",
          value: R,
          ...T
        });
        continue;
      }
      if (this.current() === "-" && this.peek() === "-") {
        let R = this.readFlag();
        this.tokens.push({
          type: "FLAG",
          value: R,
          ...T
        });
        continue;
      }
      if (/[a-zA-Z0-9_*.-]/.test(this.current()) || this.current() === "-" && /\d/.test(this.peek())) {
        let R = this.readIdentifier();
        this.tokens.push({
          type: "IDENTIFIER",
          value: R,
          ...T
        });
        continue;
      }
      throw Error(`Unexpected character '${this.current()}' at line ${this.line}, column ${this.column}`);
    }
    return this.tokens.push({
      type: "EOF",
      value: "",
      position: this.position,
      line: this.line,
      column: this.column
    }), this.tokens;
  }
}
function ubR(T) {
  try {
    let R = new bLT(T.trim()).tokenize();
    return {
      success: !0,
      data: new uLT(R).parseEntry()
    };
  } catch (R) {
    let a = R instanceof Error ? R.message : String(R),
      e = a.match(/line (\d+)/),
      t = a.match(/column (\d+)/);
    return {
      success: !1,
      error: {
        message: a,
        position: 0,
        line: e ? parseInt(e[1]) : 1,
        column: t ? parseInt(t[1]) : 1
      }
    };
  }
}
function ybR(T) {
  let R = [],
    a = "",
    e = !1,
    t = "",
    r = 1,
    h = 1;
  for (let c = 0; c < T.length; c++) {
    let s = T[c];
    if (!e && (s === '"' || s === "'")) e = !0, t = s, a += s;else if (e && s === t) {
      let A = 0,
        l = c - 1;
      while (l >= 0 && T[l] === "\\") A++, l--;
      if (A % 2 === 0) e = !1, t = "";
      a += s;
    } else if (!e && s === `
`) {
      let A = a.trim();
      if (A) R.push({
        content: A,
        lineNumber: h
      });
      a = "", r++, h = r;
    } else if (s === `
`) a += s, r++;else a += s;
  }
  let i = a.trim();
  if (i) R.push({
    content: i,
    lineNumber: h
  });
  return R;
}
function mLT(T) {
  let R = ybR(T),
    a = [];
  for (let e = 0; e < R.length; e++) {
    let t = R[e];
    if (t.content.startsWith("#")) continue;
    let r = ubR(t.content);
    if (!r.success) return r.error.line = t.lineNumber, r;
    a.push(r.data);
  }
  return {
    success: !0,
    data: a
  };
}
function PbR(T) {
  if (typeof T !== "string") return !1;
  if (/[\s*"'\\]/.test(T) || T.includes("/") || T === "" || !/^[a-zA-Z0-9_*.-]+$/.test(T)) return !0;
  if (kbR(T)) return !0;
  return !1;
}
function kbR(T) {
  return /^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(T);
}
function Ll(T) {
  if (typeof T !== "string") return String(T);
  if (!PbR(T)) return T;
  return `'${T.replace(/'/g, "\\'")}'`;
}
function HD(T, R = "") {
  let a = [];
  for (let [e, t] of Object.entries(T)) {
    let r = R ? `${R}.${e}` : e;
    if (Array.isArray(t)) for (let h = 0; h < t.length; h++) {
      let i = `${r}.${h}`;
      if (typeof t[h] === "object" && t[h] !== null) a.push(...HD(t[h], i));else a.push({
        path: i,
        value: t[h]
      });
    } else if (typeof t === "object" && t !== null) a.push(...HD(t, r));else a.push({
      path: r,
      value: t
    });
  }
  return a;
}
function xbR(T, R) {
  let a = [];
  if (typeof R === "string" || typeof R === "boolean" || typeof R === "number" || R === null) a.push(`--${T} ${Ll(R)}`);else if (Array.isArray(R)) {
    let e = R.every(t => typeof t === "string" || typeof t === "boolean" || typeof t === "number" || t === null);
    if (!T.includes(".") && e) for (let t of R) a.push(`--${T} ${Ll(t)}`);else for (let t = 0; t < R.length; t++) if (typeof R[t] === "object" && R[t] !== null) {
      let r = HD({
        [`${T}.${t}`]: R[t]
      });
      for (let {
        path: h,
        value: i
      } of r) a.push(`--${h} ${Ll(i)}`);
    } else a.push(`--${T}.${t} ${Ll(R[t])}`);
  } else if (typeof R === "object" && R !== null) {
    let e = HD({
      [T]: R
    });
    for (let {
      path: t,
      value: r
    } of e) a.push(`--${t} ${Ll(r)}`);
  }
  return a;
}
function Z2(T) {
  let R = [];
  if (R.push(T.action), T.action === "delegate" && T.to) R.push(`--to ${Ll(T.to)}`);
  if (T.action === "reject" && T.message) R.push(`--message ${Ll(T.message)}`);
  if (T.context) R.push(`--context ${T.context}`);
  if (R.push(Ll(T.tool)), T.matches) for (let [a, e] of Object.entries(T.matches)) {
    let t = xbR(a, e);
    R.push(...t);
  }
  return R.join(" ");
}
function J2(T) {
  return T.map(Z2).join(`
`);
}
function fbR(T) {
  return T.configService.config.pipe(JR(R => {
    if (R.settings?.dangerouslyAllowAll === !0) return [{
      tool: "*",
      action: "allow"
    }];
    return I0T(R.settings?.permissions);
  }), E9());
}
function IbR(T) {
  if (T.tool !== U8 && T.tool !== Eb) return;
  let R = T.tool === U8,
    a = R ? Eb : U8,
    e = T.matches ? Object.fromEntries(Object.entries(T.matches).map(([t, r]) => {
      if (R && t === "cmd") return ["command", r];
      if (R && t === "cwd") return ["workdir", r];
      if (!R && t === "command") return ["cmd", r];
      if (!R && t === "workdir") return ["cwd", r];
      return [t, r];
    })) : void 0;
  return {
    ...T,
    tool: a,
    matches: e
  };
}
function yLT(T) {
  return T.flatMap(R => {
    let a = IbR(R);
    return a ? [R, a] : [R];
  });
}
async function PLT(T, R, a, e = "thread", t, r) {
  let h = await m0(fbR(a));
  try {
    let i = yLT(h),
      c = await CD(T, R, i, e, LD, t, "user", r);
    if (!c.matchedEntry) c = await CD(T, R, PN, e, void 0, t, "built-in", r);
    if (!c.matchedEntry) return {
      permitted: !1,
      action: null,
      reason: "No matching entry found, denying by default"
    };
    let s = c.matchedEntry?.action === "delegate" && c.action !== "reject" && c.action !== "ask" ? "delegate" : c.action;
    switch (c.action) {
      case "allow":
        return {
          permitted: !0,
          action: s,
          matchedEntry: c.matchedEntry,
          error: c.error,
          source: c.source
        };
      case "reject":
        return {
          permitted: !1,
          action: s,
          matchedEntry: c.matchedEntry,
          reason: `Rejected by ${c.source === "built-in" ? "built-in" : c.source || "unknown"} permissions rule ${c.matchIndex}: ${Z2(c.matchedEntry)}`,
          error: c.error,
          source: c.source
        };
      case "ask":
        return {
          permitted: !1,
          action: s,
          matchedEntry: c.matchedEntry,
          reason: `Matches ${c.source === "built-in" ? "built-in" : c.source || "unknown"} permissions rule ${c.matchIndex}: ${Z2(c.matchedEntry)}`,
          error: c.error,
          source: c.source
        };
      case null:
        if (c.error) return {
          permitted: !1,
          action: null,
          reason: c.error,
          error: c.error
        };
        return {
          permitted: !0,
          action: null
        };
      default:
        return {
          permitted: !1,
          action: null,
          reason: "Unknown permission result"
        };
    }
  } catch (i) {
    return {
      permitted: !1,
      action: null,
      reason: i instanceof Error ? i.message : "Permission evaluation failed",
      error: i instanceof Error ? i.message : "Permission evaluation failed"
    };
  }
}
function xN(T, R) {
  return T?.addEventListener("abort", R, {
    once: !0
  }), () => T?.removeEventListener("abort", R);
}
function xr(T) {
  if (T instanceof DOMException && T.name === "AbortError") return !0;
  if (T instanceof Error) {
    if (T.name === "AbortError") return !0;
    if ("status" in T && T.status === 499) return !0;
    if (/request was aborted|The operation was aborted|AbortError/i.test(T.message)) return !0;
    if (T?.cause && xr(T.cause)) return !0;
  }
  return !1;
}
function JsT(T) {
  return T instanceof Error && T.message === u9T.USER_CANCELLED;
}
class y9T {
  filesystem;
  constructor(T) {
    this.filesystem = T;
  }
  async readFile(T, R) {
    let {
      maxBytes: a,
      signal: e,
      rejectBinary: t = !1,
      encoding: r = "utf8",
      textProcessing: h
    } = R;
    try {
      let i = (await this.filesystem.stat(T, {
          signal: e
        })).size,
        c = i > a;
      if (i <= a) {
        let l = await this.filesystem.readBinaryFile(T, {
            signal: e
          }),
          o = this.decodeText(l, r);
        if (o === void 0 && t) return {
          binary: !0,
          truncated: !1,
          fileSize: i
        };
        if (o && h) o = Mb.processText(o, h);
        return {
          content: o,
          binary: o === void 0,
          truncated: !1,
          fileSize: i
        };
      }
      let s;
      if (T.scheme === "file") try {
        if (s = await this.streamFile(T, a, r, e), s === void 0 && t) return {
          binary: !0,
          truncated: c,
          fileSize: i
        };
      } catch (l) {
        J.debug("File streaming failed for large file", {
          uri: T
        }, l);
      }
      let A = s;
      if (s && h) A = Mb.processText(s, h);
      return {
        content: A,
        binary: !1,
        truncated: c,
        fileSize: i
      };
    } catch (i) {
      return {
        binary: !1,
        truncated: !1,
        fileSize: 0,
        error: i instanceof Error ? i : Error(String(i))
      };
    }
  }
  async streamFile(T, R, a, e) {
    let {
        createReadStream: t
      } = await import("fs"),
      r = t(T.fsPath, {
        highWaterMark: 16384,
        end: R - 1
      }),
      h = xN(e, () => r.destroy());
    try {
      let i = [];
      for await (let s of r) i.push(s);
      let c = Buffer.concat(i);
      return this.decodeText(c, a);
    } finally {
      h();
    }
  }
  decodeText(T, R) {
    try {
      let a;
      if (R !== "utf8" && kLT(T)) a = T.toString(R);else a = new TextDecoder("utf-8", {
        fatal: !0
      }).decode(T);
      if (a.includes("\x00")) return;
      return a;
    } catch {
      return;
    }
  }
}
function kLT(T) {
  return typeof Buffer < "u" && Buffer.isBuffer(T);
}
async function gbR(T, R, a, e) {
  let t = e?.maxBytes ?? 32768,
    r = e?.maxLines ?? 500,
    h = e?.maxLineBytes ?? 2048,
    i = await new y9T(T).readFile(R, {
      maxBytes: t,
      rejectBinary: !0,
      signal: a,
      textProcessing: {
        maxLines: r,
        maxLineBytes: h,
        truncationStrategy: "ellipsis"
      }
    });
  if (i.error) {
    J.debug("Failed to read file for mention", {
      uri: R
    }, i.error);
    return;
  }
  if (i.binary) return "binary";
  if (!i.content) return;
  if (i.truncated) {
    let c = Math.round(i.fileSize / 1024),
      s = Math.round(t / 1024);
    return `${i.content}

... [File truncated - showing first ${s}KB of ${c}KB total]`;
  }
  return i.content;
}
function An(T) {
  return xLT.test(T);
}
function Kf(T) {
  return typeof T === "string" ? T : T.toString();
}
function TG(T, R, a) {
  if (!kL.has(T)) kL.set(T, new Map());
  kL.get(T).set(R, a);
}
function fr(T, R, a = 0, e = !1) {
  let t = `readUInt${R}${e ? "BE" : "LE"}`;
  return vLT[t](T, a);
}
function vbR(T, R) {
  if (T.length - R < 4) return;
  let a = se(T, R);
  if (T.length - R < a) return;
  return {
    name: V8(T, 4 + R, 8 + R),
    offset: R,
    size: a
  };
}
function Jh(T, R, a) {
  while (a < T.length) {
    let e = vbR(T, a);
    if (!e) break;
    if (e.name === R) return e;
    a += e.size > 0 ? e.size : 8;
  }
}
function ToT(T, R) {
  let a = T[R];
  return a === 0 ? 256 : a;
}
function RoT(T, R) {
  let a = RmR + R * amR;
  return {
    height: ToT(T, a + 1),
    width: ToT(T, a)
  };
}
function jbR(T, R) {
  let a = R + hmR;
  return [V8(T, R, a), se(T, a)];
}
function SbR(T) {
  let R = jLT[T];
  return {
    width: R,
    height: R,
    type: T
  };
}
function ObR(T) {
  return Qy(T, 2, 6) === imR;
}
function dbR(T, R) {
  return {
    height: qD(T, R),
    width: qD(T, R + 2)
  };
}
function EbR(T, R) {
  let a = RG + 8,
    e = fr(T, 16, a, R);
  for (let t = 0; t < e; t++) {
    let r = a + lmR + t * poT,
      h = r + poT;
    if (r > T.length) return;
    let i = T.slice(r, h);
    if (fr(i, 16, 0, R) === 274) {
      if (fr(i, 16, 2, R) !== 3) return;
      if (fr(i, 32, 4, R) !== 1) return;
      return fr(i, 16, 8, R);
    }
  }
}
function CbR(T, R) {
  let a = T.slice(cmR, R),
    e = Qy(a, RG, RG + smR),
    t = e === omR;
  if (t || e === nmR) return EbR(a, t);
}
function LbR(T, R) {
  if (R > T.length) throw TypeError("Corrupt JPG, exceeded buffer limits");
}
function ILT(T, R) {
  if (R) return 8 * (1 + T.getBits(5));
  let a = T.getBits(2),
    e = [9, 13, 18, 30][a];
  return 1 + T.getBits(e);
}
function MbR(T, R, a, e) {
  if (R && a === 0) return 8 * (1 + T.getBits(5));
  if (a === 0) return ILT(T, !1);
  return Math.floor(e * [1, 1.2, 1.3333333333333333, 1.5, 1.7777777777777777, 1.25, 2][a - 1]);
}
function DbR(T) {
  let R = Jh(T, "jxlc", 0);
  if (R) return T.slice(R.offset + 8, R.offset + R.size);
  let a = wbR(T);
  if (a.length > 0) return BbR(a);
  return;
}
function wbR(T) {
  let R = [],
    a = 0;
  while (a < T.length) {
    let e = Jh(T, "jxlp", a);
    if (!e) break;
    R.push(T.slice(e.offset + 12, e.offset + e.size)), a = e.offset + e.size;
  }
  return R;
}
function BbR(T) {
  let R = T.reduce((t, r) => t + r.length, 0),
    a = new Uint8Array(R),
    e = 0;
  for (let t of T) a.set(t, e), e += t.length;
  return a;
}
function WD(T) {
  let R = SLT.exec(T);
  if (!R) return;
  return Math.round(Number(R[1]) * (aG[R[2]] || 1));
}
function NbR(T) {
  let R = T.split(" ");
  return {
    height: WD(R[3]),
    width: WD(R[2])
  };
}
function UbR(T) {
  let R = T.match(H$.width),
    a = T.match(H$.height),
    e = T.match(H$.viewbox);
  return {
    height: a && WD(a[2]),
    viewbox: e && NbR(e[2]),
    width: R && WD(R[2])
  };
}
function HbR(T) {
  return {
    height: T.height,
    width: T.width
  };
}
function WbR(T, R) {
  let a = R.width / R.height;
  if (T.width) return {
    height: Math.floor(T.width / a),
    width: T.width
  };
  if (T.height) return {
    height: T.height,
    width: Math.floor(T.height * a)
  };
  return {
    height: R.height,
    width: R.width
  };
}
function qbR(T, {
  isBigEndian: R,
  isBigTiff: a
}) {
  let e = a ? Number(k9T(T, 8, R)) : fr(T, 32, 4, R),
    t = a ? Ct.COUNT_SIZE.BIG : Ct.COUNT_SIZE.STANDARD;
  return T.slice(e + t);
}
function zbR(T, R, a, e) {
  switch (R) {
    case Ct.TYPE.SHORT:
      return fr(T, 16, a, e);
    case Ct.TYPE.LONG:
      return fr(T, 32, a, e);
    case Ct.TYPE.LONG8:
      {
        let t = Number(k9T(T, a, e));
        if (t > Number.MAX_SAFE_INTEGER) throw TypeError("Value too large");
        return t;
      }
    default:
      return 0;
  }
}
function FbR(T, R) {
  let a = R ? Ct.ENTRY_SIZE.BIG : Ct.ENTRY_SIZE.STANDARD;
  if (T.length > a) return T.slice(a);
}
function GbR(T, {
  isBigEndian: R,
  isBigTiff: a
}) {
  let e = {},
    t = T;
  while (t?.length) {
    let r = fr(t, 16, 0, R),
      h = fr(t, 16, 2, R),
      i = a ? Number(k9T(t, 4, R)) : fr(t, 32, 4, R);
    if (r === 0) break;
    if (i === 1 && (h === Ct.TYPE.SHORT || h === Ct.TYPE.LONG || a && h === Ct.TYPE.LONG8)) {
      let c = a ? 12 : 8;
      e[r] = zbR(t, h, c, R);
    }
    t = FbR(t, a);
  }
  return e;
}
function KbR(T) {
  let R = V8(T, 0, 2),
    a = fr(T, 16, 2, R === "MM");
  return {
    isBigEndian: R === "MM",
    isBigTiff: a === 43
  };
}
function VbR(T, R) {
  let a = fr(T, 16, 4, R),
    e = fr(T, 16, 6, R);
  if (a !== 8 || e !== 0) throw TypeError("Invalid BigTIFF header");
}
function XbR(T) {
  return {
    height: 1 + eoT(T, 7),
    width: 1 + eoT(T, 4)
  };
}
function YbR(T) {
  return {
    height: 1 + ((T[4] & 15) << 10 | T[3] << 2 | (T[2] & 192) >> 6),
    width: 1 + ((T[2] & 63) << 8 | T[1])
  };
}
function QbR(T) {
  return {
    height: aoT(T, 8) & 16383,
    width: aoT(T, 6) & 16383
  };
}
function ZbR(T) {
  let R = T[0],
    a = dLT.get(R);
  if (a && Dj.get(a).validate(T)) return a;
  return OLT.find(e => Dj.get(e).validate(T));
}
function gLT(T) {
  let R = ZbR(T);
  if (typeof R < "u") {
    if (ELT.disabledTypes.indexOf(R) > -1) throw TypeError(`disabled file type: ${R}`);
    let a = Dj.get(R).calculate(T);
    if (a !== void 0) {
      if (a.type = a.type ?? R, a.images && a.images.length > 1) {
        let e = a.images.reduce((t, r) => {
          return r.width * r.height > t.width * t.height ? r : t;
        }, a.images[0]);
        a.width = e.width, a.height = e.height;
      }
      return a;
    }
  }
  throw TypeError(`unsupported file type: ${R}`);
}
function fN(T) {
  return CLT.includes(T);
}
function eG(T) {
  return LLT[T] ?? null;
}
function mmR(T) {
  try {
    let R = gLT(T);
    if (R.width && R.height && R.width > 0 && R.height > 0) return {
      width: R.width,
      height: R.height
    };
    return null;
  } catch {
    return null;
  }
}
function x9T(T) {
  try {
    let R = gLT(T);
    if (R.type) return MLT[R.type] ?? null;
    return null;
  } catch {
    return null;
  }
}
function XA(T) {
  let R = T.source.type === "base64" ? Buffer.from(T.source.data, "base64") : T.source.data,
    a = T.source.type === "file" ? T.source.path : void 0;
  if (R.length === 0) return a ? `Image file is empty (0 bytes): ${a}` : "Image file is empty (0 bytes)";
  if (R.length > zD) {
    let t = (zD / 1048576).toFixed(1),
      r = (R.length / 1048576).toFixed(1);
    if (T.source.type === "base64" && !a) return `Image too large: ${r}MB (max: ${t}MB)`;
    let h = `Image file too large: ${r}MB (max: ${t}MB)`;
    return a ? `${h} - ${a}` : h;
  }
  let e = mmR(R);
  if (e) {
    if (e.width > lq || e.height > lq) {
      let t = `Image dimensions too large: ${e.width}x${e.height}px (max ${lq}px per dimension)`;
      return a ? `${t} - ${a}` : t;
    }
  }
  return null;
}
function Er(T) {
  return T instanceof ur || T instanceof Error && T.name === "FileNotExistError" || typeof T === "object" && T !== null && "code" in T && typeof T.code === "string" && ["ENOENT", "FileNotFound"].includes(T.code);
}
function umR(T) {
  return typeof T === "object" && T !== null && "base" in T && "pattern" in T && typeof T.pattern === "string";
}
function ymR(T) {
  return {
    ...T,
    writeFile: () => Promise.reject(Error("Write operations not implemented")),
    delete: () => Promise.reject(Error("Write operations not implemented")),
    mkdirp: () => Promise.reject(Error("Write operations not implemented")),
    rename: () => Promise.reject(Error("Write operations not implemented")),
    isExclusiveWriterFor: () => Promise.resolve(!1)
  };
}
async function voT(T, R, a) {
  try {
    return await T.readFile(R, a);
  } catch (e) {
    if (e instanceof ur) return null;
    throw e;
  }
}
async function Aq(T, R, a) {
  try {
    return await T.access(R, a), !0;
  } catch (e) {
    if (Er(e)) return !1;
    throw e;
  }
}
function DLT(T) {
  let R = MR.extname(T).toLowerCase(),
    a = BLT[R];
  if (a && fN(a)) return {
    mimeType: a
  };
  return null;
}
async function wLT(T, R, a) {
  let e = DLT(R);
  if (e) {
    let t = await T.stat(R, {
      signal: a
    });
    return {
      ...e,
      size: t.size
    };
  }
  return null;
}
async function PmR(T, R, a) {
  let e = DLT(R);
  if (!e) return {
    success: !1,
    error: `Unsupported image file extension: ${MR.extname(R).toLowerCase()}. Supported extensions: .png, .jpg, .jpeg, .gif, .webp`
  };
  try {
    let t = await T.readBinaryFile(R, {
        signal: a
      }),
      r = t instanceof Buffer ? t : Buffer.from(t),
      h = XA({
        source: {
          type: "file",
          path: R.fsPath,
          data: r
        }
      });
    if (h) return {
      success: !1,
      error: h
    };
    return {
      success: !0,
      image: {
        mimeType: e.mimeType,
        data: r.toString("base64")
      }
    };
  } catch (t) {
    if (Er(t)) return {
      success: !1,
      error: `Image file not found: ${R.fsPath}`
    };
    return {
      success: !1,
      error: `Failed to read image file: ${R.fsPath} - ${t instanceof Error ? t.message : String(t)}`
    };
  }
}
function NLT(T, R, a) {
  let e = T.length,
    t = R ? Math.max(0, R[0] - 1) : 0,
    r = R ? Math.min(e, R[1]) : Math.min(e, a),
    h = [];
  if (t > 0) h.push(`[... omitted ${t} ${o9(t, "entry", "entries")} ...]`);
  if (h.push(...T.slice(t, r)), r < e) h.push(`[... omitted ${e - r} more ...]`);
  return h.join(`
`);
}
function xmR({
  readFileFn: T,
  readBinaryFileFn: R,
  maxFileSizeBytes: a,
  maxLines: e = tG,
  maxLineBytes: t = WLT
}) {
  return async ({
    args: r
  }, {
    thread: h,
    filesystem: i
  }, c) => {
    if (I9T(r.path)) return {
      status: "error",
      error: {
        errorCode: "reading-secret-file",
        message: "Refusing to read env file because it likely contains secrets."
      }
    };
    let s = mi(r.path);
    try {
      if ((await i.stat(s, {
        signal: c
      })).isDirectory) {
        let o = await i.readdir(s, {
            signal: c
          }),
          n = o.length > pq,
          p = o.slice(0, pq).map(m => ({
            name: MR.basename(m.uri),
            isDirectory: m.isDirectory
          })).sort((m, b) => {
            if (m.isDirectory !== b.isDirectory) return m.isDirectory ? -1 : 1;
            return m.name.localeCompare(b.name);
          }).map(m => m.name + (m.isDirectory ? "/" : "")),
          _ = NLT(p, r.read_range, e);
        if (n) {
          let m = o.length - pq;
          _ += `

[... directory listing truncated, ${m} more ${o9(m, "entry", "entries")} not shown ...]`;
        }
        return {
          status: "done",
          progress: {},
          result: {
            absolutePath: s.fsPath,
            content: _,
            isDirectory: !0,
            directoryEntries: p
          },
          trackFiles: [d0(s)]
        };
      }
      let A = await wLT(i, s, c);
      if (A) {
        let o = await R(s, c),
          n = kLT(o) ? o.toString("base64") : btoa(String.fromCharCode(...o)),
          p = n.length;
        if (p > zD) {
          let _ = (p / 1048576).toFixed(1),
            m = (zD / 1048576).toFixed(1);
          return {
            status: "error",
            error: {
              message: `Error: Image file (${_} MB) exceeds maximum allowed size (${m} MB).`,
              absolutePath: s.fsPath
            }
          };
        }
        return {
          status: "done",
          progress: {},
          result: {
            absolutePath: s.fsPath,
            content: n,
            isImage: !0,
            imageInfo: {
              mimeType: A.mimeType,
              size: A.size
            }
          },
          trackFiles: [d0(s)]
        };
      }
      if (!(await i.isExclusiveWriterFor(s))) TG(s, h.id, Date.now());
      let l;
      if (r.read_range && s.scheme === "file") l = (await ImR(s, r.read_range, c, t)).join(`
`);else if (r.read_range) {
        let o = (await T(s, c)).split(`
`);
        l = fmR(o, r, e, t);
      } else {
        let o = await new y9T(i).readFile(s, {
          maxBytes: a,
          signal: c,
          textProcessing: {
            addLineNumbers: !0,
            maxLines: e,
            maxLineBytes: t,
            truncationStrategy: "ellipsis"
          }
        });
        if (o.error) return {
          status: "error",
          error: {
            message: o.error.message,
            absolutePath: s.fsPath
          }
        };
        if (o.binary) return {
          status: "error",
          error: {
            message: `File appears to be binary and cannot be read as text (${(o.fileSize / 1024).toFixed(1)} KB). Binary files like executables, archives, or compiled assets are not supported by the ${y8} tool.`,
            absolutePath: s.fsPath
          }
        };
        if (o.content === void 0) {
          let n = Math.round(o.fileSize / 1024),
            p = Math.round(a / 1024);
          return {
            status: "error",
            error: {
              message: `Error: File content (${n} KB) exceeds maximum allowed size (${p} KB). Use read_range parameters to read specific line ranges in the file, or use the ${ht} tool to search for specific content.`,
              absolutePath: s.fsPath
            }
          };
        }
        l = o.content;
      }
      return {
        status: "done",
        progress: {},
        result: {
          absolutePath: s.fsPath,
          content: l
        },
        trackFiles: [d0(s)]
      };
    } catch (A) {
      return {
        status: "error",
        error: {
          message: A instanceof Error ? A.message : String(A),
          absolutePath: s.fsPath
        }
      };
    }
  };
}
function fmR(T, R, a, e) {
  let t = T[T.length - 1] === "" ? T.slice(0, -1) : T,
    r = {
      start: 0,
      end: Math.min(t.length, a)
    },
    h = R.read_range ? {
      start: Math.max(0, R.read_range[0] - 1),
      end: Math.min(t.length, R.read_range[1])
    } : r,
    i = t.slice(h.start, h.end).map(c => Mb.pruneWideLine(c, e)).map((c, s) => `${s + h.start + 1}: ${c}`);
  if (h.start > 0) i.unshift(`[... omitted lines 1 to ${h.start} ...]`);
  if (h.end < t.length) i.push(`[... omitted lines ${h.end + 1} to ${t.length} ...]`);
  return i.join(`
`);
}
async function ULT(T, R, a, e) {
  if (a = a.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (r, h) => {
    return process.env[h] || r;
  }), a = a.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (r, h) => {
    return process.env[h] || r;
  }), a.startsWith("~") && typeof process < "u" && process.env.HOME) a = kmR.join(process.env.HOME, a.slice(1));
  if (An(a)) return zR.file(a);
  for (let r of R) {
    let h = MR.joinPath(r, a);
    try {
      return await T.getMtime(h, {
        signal: e
      }), h;
    } catch {}
  }
  let t = R.at(0);
  if (t) return MR.joinPath(t, a);
  return zR.file(a);
}
function mi(T) {
  if (!An(T)) throw Error(`Path must be absolute, not relative: ${T}`);
  return zR.file(T);
}
function I9T(T) {
  let R = qA(T),
    a = FdT(R).slice(1).toLowerCase();
  if (qLT.includes(a)) return !1;
  if (R === ".env.example" || R === ".env.sample") return !1;
  return /^\.env(\..*)?$/.test(R) || /^env\..+$/.test(R) || /\.(env|secret|credentials|envrc)$/i.test(R);
}
async function ImR(T, R, a, e) {
  let t = R ? Math.max(1, R[0]) : 1,
    r = R ? Math.max(t, R[1]) : t + 1000 - 1,
    h = [],
    i = 0,
    [{
      createInterface: c
    }, {
      createReadStream: s
    }] = await Promise.all([import("readline"), import("fs")]),
    A = c({
      input: s(T.fsPath, {
        encoding: "utf8",
        highWaterMark: 65536
      }),
      crlfDelay: 1 / 0
    }),
    l = xN(a, () => A.close()),
    o = 20000,
    n = !1;
  try {
    for await (let _ of A) {
      if (i++, i < t) continue;
      if (i > r) {
        if (!n) n = !0;
        if (i >= o) break;
        continue;
      }
      h.push(Mb.pruneWideLine(_, e));
    }
  } finally {
    l(), A.close();
  }
  if (t > 1) h.unshift(`[... omitted lines 1 to ${t - 1} ...]`);
  if (n) {
    let _ = i >= o ? `${o}+` : String(i);
    h.push(`[... omitted lines ${r + 1} to ${_} ...]`);
  }
  let p = t;
  return h.map(_ => _.startsWith("[... omitted lines") ? _ : `${p++}: ${_}`);
}
function zLT(T) {
  let [, R, a] = T.split(/mcp__([^ ]+)__([^ ]+)/);
  if (!R || !a) return;
  return {
    server: R,
    tool: a
  };
}
function SoT(T) {
  return ["done", "error", "cancelled"].includes(T.status);
}
function _q(T) {
  return typeof T === "object" && "key" in T;
}
function $mR(T) {
  let R = [],
    a = new W0(),
    e,
    t = new f0([]),
    r = new Map();
  async function h(o) {
    return new Promise((n, p) => {
      let _ = {
        ...o,
        id: crypto.randomUUID(),
        timestamp: Date.now()
      };
      r.set(o.toolUseId, {
        resolve: n,
        reject: p
      });
      let m = t.getValue();
      t.next([...m, _]);
    });
  }
  function i(o, n, p) {
    let _ = t.getValue();
    t.next(_.filter(b => b.toolUseId !== o));
    let m = r.get(o);
    if (m) m.resolve({
      accepted: n,
      feedback: p
    }), r.delete(o);
  }
  function c(o) {
    let n = t.getValue(),
      p = n.filter(_ => _.threadId === o || _.mainThreadId === o);
    for (let _ of p) {
      let m = r.get(_.toolUseId);
      if (m) m.resolve({
        accepted: !1
      }), r.delete(_.toolUseId);
    }
    t.next(n.filter(_ => _.threadId !== o && _.mainThreadId !== o));
  }
  function s(o) {
    let n = t.getValue();
    if (n.some(_ => _.toolUseId === o.toolUseId)) return;
    let p = {
      ...o,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };
    t.next([...n, p]);
  }
  function A(o, n) {
    if (!o) {
      J.warn("findEarliestNonDisabledTool called with empty tool name");
      return;
    }
    let p = R.filter(_ => _.spec.name === o);
    if (p.length === 0) {
      let _ = o.toLowerCase();
      p = R.filter(m => m.spec.name.toLowerCase() === _);
    }
    for (let _ of p) if (yy(_.spec, n).enabled) return _;
    return;
  }
  function l(o, n, p) {
    if (!o) throw Error("spec is required");
    let _ = R.findIndex(y => y.spec.name === o.name),
      m = _ !== -1 ? R[_] : void 0;
    if (o.source !== "builtin" && m?.spec.source === "builtin") return J.warn("Ignoring external tool registration - builtin takes precedence", {
      toolName: o.name,
      externalSource: o.source
    }), {
      dispose: () => {}
    };
    let b = {
      spec: o,
      fn: Promise.resolve(n),
      preprocessArgs: p
    };
    if (m && JSON.stringify(m.spec.source) === JSON.stringify(o.source)) R[_] = b;else R.push(b);
    return a.next(), {
      dispose: () => {
        let y = R.indexOf(b);
        if (y !== -1) R.splice(y, 1), a.next();
      }
    };
  }
  return T.configService.config.subscribe(o => {
    e = o;
  }), {
    registerTool({
      spec: o,
      fn: n,
      preprocessArgs: p
    }) {
      if (!n) return FLT;
      return l(o, n, p);
    },
    tools: v3(T.configService.config, a.pipe(Y3(void 0))).pipe(JR(([o]) => {
      return R.map(n => ({
        spec: n.spec,
        ...yy(n.spec, o)
      })).sort((n, p) => n.spec.name.localeCompare(p.spec.name));
    })),
    invokeTool(o, n, p) {
      if (o === hG && n.args && "invalid_tool_name" in n.args && typeof n.args.invalid_tool_name === "string") {
        cs.add(1, {
          toolName: o,
          error: "invalid"
        });
        let b = rG(n.args.invalid_tool_name);
        return new AR(y => {
          y.error(Error(b));
        });
      }
      if (!A(o, p.config)) {
        let b = o.toLowerCase(),
          y = R.filter(f => f.spec.name.toLowerCase() === b);
        if (y.length === 0) return cs.add(1, {
          toolName: o,
          error: "not_found"
        }), new AR(f => {
          f.error(Error(`tool ${JSON.stringify(o)} not found`));
        });
        let u = y[0],
          P = u.spec.name,
          k = yy(u.spec, p.config);
        cs.add(1, {
          toolName: o,
          error: "disabled"
        });
        let x = k.enabled ? "unknown" : k.disabledReason;
        return new AR(f => {
          f.error(Error(`tool ${JSON.stringify(P)} is disabled: ${x}`));
        });
      }
      let _ = p.subagentSpec ?? p.agentMode;
      if (_ && !this.isToolAllowed(o, _)) {
        cs.add(1, {
          toolName: o,
          error: "disabled"
        });
        let b = _q(_) ? _.displayName ?? _.key : `${_} mode`;
        return new AR(y => {
          y.error(Error(`tool ${JSON.stringify(o)} is not allowed for ${b}`));
        });
      }
      if (p.thread.mainThreadID && !p.subagentSpec && !tq(o, qe["task-subagent"])) return cs.add(1, {
        toolName: o,
        error: "disabled"
      }), new AR(b => {
        b.error(Error(`tool ${JSON.stringify(o)} is not allowed for subagents`));
      });
      let m = () => this.invokeLeasedTool(o, n, p);
      if (n.userInput?.accepted === !0) return J.debug(`Tool ${String(o)} already approved by user - bypassing permission check`), m();
      if (n.userInput?.accepted === !1) return J.debug(`Tool ${String(o)} rejected by user`), new AR(b => {
        b.next({
          status: "rejected-by-user",
          reason: "Tool execution rejected by user"
        }), b.complete();
      });
      return new AR(b => {
        let y = null,
          u = !1;
        J.debug(`Tool ${String(o)} - checking permissions`);
        let P = p.thread.mainThreadID ? "subagent" : "thread",
          k = this.preprocessArgs?.(o, n.args, p) ?? n.args;
        return PLT(o, k, {
          configService: p.configService
        }, P, p.thread.id, p.toolUseID).then(async x => {
          if (u) return;
          if (!x) {
            y = m().subscribe(b);
            return;
          }
          let {
            permitted: f,
            reason: v,
            action: g,
            error: I,
            matchedEntry: S,
            source: O
          } = x;
          if (!f) {
            if (J.debug(`Tool ${String(o)} not permitted - action: ${g}, reason: ${v}`), g === "ask") {
              J.debug(`Tool ${String(o)} - requesting user approval`);
              let C = (o === U8 || o === Eb) && typeof k === "object" && k !== null ? [k.cmd, k.command].filter(Boolean) : void 0,
                L = S ? {
                  tool: S.tool,
                  action: S.action,
                  matches: S.matches
                } : void 0;
              try {
                let w = await h({
                  threadId: p.thread.id,
                  mainThreadId: p.thread.mainThreadID,
                  toolUseId: p.toolUseID,
                  toolName: String(o),
                  args: k,
                  reason: v || "Tool requires user approval",
                  toAllow: C,
                  context: P,
                  subagentToolName: p.subagentSpec?.displayName,
                  parentToolUseId: p.parentToolUseId,
                  matchedRule: L,
                  ruleSource: O
                });
                if (u) return;
                if (w.accepted) J.debug(`Tool ${String(o)} - user approved, executing`), b.next({
                  status: "in-progress"
                }), y = m().subscribe(b);else if (w.feedback) J.debug(`Tool ${String(o)} - user rejected with feedback: ${w.feedback}`), b.next({
                  status: "error",
                  error: {
                    message: `This tool call was rejected by the user with feedback: ${w.feedback}`
                  }
                }), b.complete();else J.debug(`Tool ${String(o)} - user rejected`), b.next({
                  status: "rejected-by-user",
                  reason: v || "Tool execution rejected by user",
                  toAllow: C
                }), b.complete();
              } catch (w) {
                if (u) return;
                J.error(`Approval request failed for tool ${String(o)}:`, w), b.next({
                  status: "error",
                  error: {
                    message: w instanceof Error ? w.message : "Approval request failed"
                  }
                }), b.complete();
              }
              return;
            }
            if (g === "reject" && I) b.next({
              status: "error",
              error: {
                message: I
              }
            });else b.next({
              status: "rejected-by-user",
              reason: v || "Tool execution denied by permissions"
            });
            b.complete();
            return;
          }
          J.debug(`Tool ${String(o)} permitted - action: ${g}`);
          let j = g === "delegate",
            d = p.dir?.fsPath;
          if (!j && d) try {
            let C = jmR(o, k, d),
              L,
              w = new Set();
            for (let D of C) {
              let B = mi(D),
                M = await p.filesystem.realpath(B).catch(() => B),
                V = B.fsPath,
                Q = M.fsPath,
                W = Q !== V,
                eT = await rcT(B, p.filesystem, p.config.settings),
                iT = W ? await rcT(M, p.filesystem, p.config.settings) : eT,
                aT = eT.requiresConsent ? eT : iT;
              if (aT.requiresConsent) {
                if (L ||= aT.reason, w.add(V), W) w.add(Q);
              }
            }
            if (w.size > 0) {
              let D = [...w];
              J.debug(`Tool ${String(o)} requires guarded file consent: ${L}`, {
                guardedPaths: D
              });
              try {
                let B = await h({
                  threadId: p.thread.id,
                  mainThreadId: p.thread.mainThreadID,
                  toolUseId: p.toolUseID,
                  toolName: String(o),
                  args: k,
                  reason: L || "File requires user consent",
                  toAllow: D,
                  context: P
                });
                if (u) return;
                if (B.accepted) J.debug(`Tool ${String(o)} - guarded file approved, executing`), b.next({
                  status: "in-progress"
                }), y = m().subscribe(b);else if (B.feedback) J.debug(`Tool ${String(o)} - guarded file rejected with feedback: ${B.feedback}`), b.next({
                  status: "error",
                  error: {
                    message: `This tool call was rejected by the user with feedback: ${B.feedback}`
                  }
                }), b.complete();else J.debug(`Tool ${String(o)} - guarded file rejected`), b.next({
                  status: "rejected-by-user",
                  reason: L || "Tool execution rejected by user",
                  toAllow: D
                }), b.complete();
              } catch (B) {
                if (u) return;
                J.error(`Guarded file approval request failed for tool ${String(o)}:`, B), b.next({
                  status: "error",
                  error: {
                    message: B instanceof Error ? B.message : "Approval request failed"
                  }
                }), b.complete();
              }
              return;
            }
          } catch (C) {
            J.warn(`Guarded file check failed for tool ${String(o)}:`, C);
          }
          y = m().subscribe(b);
        }).catch(x => {
          if (u) return;
          J.error(`Permission check failed for tool ${String(o)}:`, x), b.next({
            status: "error",
            error: {
              message: x.message || "Permission check failed"
            }
          }), b.complete();
        }), () => {
          u = !0, y?.unsubscribe();
          let x = r.get(p.toolUseID);
          if (x) {
            x.resolve({
              accepted: !1
            }), r.delete(p.toolUseID);
            let f = t.getValue();
            t.next(f.filter(v => v.toolUseId !== p.toolUseID));
          }
        };
      });
    },
    invokeLeasedTool(o, n, p) {
      let _ = performance.now(),
        m = () => GLT.record(performance.now() - _, {
          toolName: o
        });
      if (o === hG && n.args && "invalid_tool_name" in n.args && typeof n.args.invalid_tool_name === "string") {
        cs.add(1, {
          toolName: o,
          error: "invalid"
        });
        let y = rG(n.args.invalid_tool_name);
        return new AR(u => {
          u.error(Error(y));
        });
      }
      let b = A(o, p.config);
      if (!b) {
        let y = o.toLowerCase(),
          u = R.filter(P => P.spec.name.toLowerCase() === y);
        if (u.length > 0) {
          let P = u[0],
            k = P.spec.name,
            x = yy(P.spec, p.config);
          cs.add(1, {
            toolName: o,
            error: "disabled"
          });
          let f = x.enabled ? "unknown" : x.disabledReason;
          return new AR(v => {
            v.error(Error(`tool ${JSON.stringify(k)} is disabled: ${f}`));
          });
        }
        return cs.add(1, {
          toolName: o,
          error: "not_found"
        }), new AR(P => {
          P.error(Error(`tool ${JSON.stringify(o)} not found`));
        });
      }
      if (cs.add(1, {
        toolName: o
      }), o === oc) {
        let y = n?.name;
        if (y) KLT.add(1, {
          skillName: y
        });
      }
      return Q9(() => b.fn).pipe(L9(y => {
        let u = OmR(n, b.spec.inputSchema, o),
          P = y(u, p);
        if (b.spec.meta?.disableTimeout) return P;
        return pbR(P, OnR(p.config));
      }), tN(() => m()));
    },
    preprocessArgs(o, n, p) {
      let _ = A(o, p.config);
      if (!_ || !_.preprocessArgs) return;
      let m = _.preprocessArgs;
      try {
        return m(n, p);
      } catch (b) {
        J.error("preprocessArgs", {
          id: o,
          args: n,
          error: String(b)
        });
        return;
      }
    },
    isToolAllowed(o, n) {
      let p = this.normalizeToolName(o),
        _ = R.find(b => b.spec.name === p),
        m = _?.spec.source;
      if (typeof m === "object" && ("mcp" in m || "toolbox" in m || "plugin" in m)) return !0;
      if (_q(n)) return tq(p, n, _?.spec.meta);
      return IiT(p, n);
    },
    getTools(o) {
      return v3(T.configService.config, a.pipe(Y3(void 0))).pipe(JR(([n]) => {
        return R.filter(p => {
          if (_q(o)) return tq(p.spec.name, o, p.spec.meta);
          if (p.spec.meta?.deferred === !0) return !1;
          if (RAR(p.spec.name, o)) return !1;
          let _ = p.spec.source;
          if (typeof _ === "object" && ("mcp" in _ || "toolbox" in _ || "plugin" in _)) return !0;
          return IiT(p.spec.name, o);
        }).map(p => {
          return {
            spec: p.spec,
            ...yy(p.spec, n)
          };
        }).sort((p, _) => p.spec.name.localeCompare(_.spec.name));
      }));
    },
    getToolsForMode(o, n) {
      if (n) return this.getTools(qe["task-subagent"]);
      return this.getTools(o);
    },
    getExecutionProfile(o) {
      if (!e) return;
      return A(o, e)?.spec.executionProfile;
    },
    getToolSpec(o) {
      return R.find(n => n.spec.name === o)?.spec;
    },
    normalizeToolName(o) {
      if (o === S2) return U8;
      return o;
    },
    normalizeToolArgs(o, n, p) {
      if (o === S2) return {
        ...n,
        cmd: typeof n.cmd === "string" ? n.cmd : typeof n.command === "string" ? n.command : "",
        cwd: typeof n.cwd === "string" ? n.cwd : typeof n.workdir === "string" ? n.workdir : void 0
      };
      return n;
    },
    pendingApprovals$: t,
    resolveApproval: i,
    clearApprovalsForThread: c,
    requestApproval: h,
    restoreApproval: s,
    dispose() {
      for (let [o, n] of r) n.resolve({
        accepted: !1
      }), r.delete(o);
      t.next([]);
    }
  };
}
function vmR(T, R) {
  if (Vf(T.name, R)) return !0;
  if (typeof T.source === "object" && "mcp" in T.source) {
    let a = zLT(T.name);
    if (a) {
      if (T.source.mcp.replace(/[\s-]+/g, "_") === a.server) {
        if (Vf(a.tool, R)) return !0;
        let e = `mcp__${T.source.mcp}__${a.tool}`;
        if (Vf(e, R)) return !0;
      }
    }
  }
  if (T.source === "builtin" && Vf(`builtin:${T.name}`, R)) return !0;
  if (typeof T.source === "object" && "toolbox" in T.source && Vf(`toolbox:${T.name}`, R)) return !0;
  return !1;
}
function Vf(T, R) {
  for (let a of R) {
    if (a === "") continue;
    if (a.length === 1) {
      if (a === "*") return !0;
      if (a === T) return !0;
      continue;
    }
    if (T === a) return !0;
    if (a.includes("*") || a.includes("?") || a.includes("[") || a.includes("{")) try {
      if (g9T.default(a, {
        dot: !0
      })(T)) return !0;
    } catch (e) {}
  }
  return !1;
}
function Xf(T, R) {
  for (let a of R) {
    if (a === "") continue;
    if (a.length === 1) {
      if (a === "*") return !0;
      if (a === T) return !0;
      continue;
    }
    if (T === a) return !0;
    if (a.includes("*") || a.includes("?") || a.includes("[") || a.includes("{")) try {
      if (g9T.default(a, {
        dot: !0
      })(T)) return !0;
    } catch (e) {}
  }
  return !1;
}
function yy(T, R) {
  let a = R.settings?.["tools.disable"] ?? [],
    e = R.settings?.["tools.enable"];
  if (e !== void 0 && e.length > 0) {
    if (!vmR(T, e)) return {
      enabled: !1,
      disabledReason: "settings"
    };
  }
  if (Xf(T.name, a)) return {
    enabled: !1,
    disabledReason: "settings"
  };
  if (typeof T.source === "object" && "mcp" in T.source) {
    let t = zLT(T.name);
    if (t) {
      if (T.source.mcp.replace(/[\s-]+/g, "_") === t.server) {
        if (Xf(t.tool, a)) return {
          enabled: !1,
          disabledReason: "settings"
        };
        let r = `mcp__${T.source.mcp}__${t.tool}`;
        if (Xf(r, a)) return {
          enabled: !1,
          disabledReason: "settings"
        };
      }
    }
  }
  if (T.source === "builtin" && Xf(`builtin:${T.name}`, a)) return {
    enabled: !1,
    disabledReason: "settings"
  };
  if (typeof T.source === "object" && "toolbox" in T.source && Xf(`toolbox:${T.name}`, a)) return {
    enabled: !1,
    disabledReason: "settings"
  };
  return {
    enabled: !0
  };
}
function rG(T) {
  return `Invalid tool name ${JSON.stringify(T)}. Tool names must match the pattern ${IN.toString()}. Try again with a valid tool name.`;
}
function jmR(T, R, a) {
  if ((T === ke || T === Wt) && typeof R === "object" && R !== null && "path" in R && typeof R.path === "string") return [R.path];
  if (T === sk && typeof R === "object" && R !== null && "patchText" in R && typeof R.patchText === "string") try {
    return XS(R.patchText).hunks.flatMap(e => {
      if (e.type === "update" && e.movePath) return [e.path, e.movePath];
      return [e.path];
    }).map(e => joT.isAbsolute(e) ? e : joT.resolve(a, e));
  } catch {
    return [];
  }
  return [];
}
function xL(T, R, a, e) {
  if (R === void 0 || T === null || T === void 0) return T;
  let t = R.type;
  if (bq(t, "array") && typeof T === "string") {
    let r = SmR(T);
    if (Array.isArray(r)) {
      let h = R.items;
      return r.map((i, c) => xL(i, h, `${a}[${c}]`, e));
    }
  }
  if (bq(t, "array") && Array.isArray(T)) {
    let r = R.items;
    return T.map((h, i) => xL(h, r, `${a}[${i}]`, e));
  }
  if (bq(t, "object") && typeof T === "object" && !Array.isArray(T)) {
    let r = R.properties;
    if (!r) return T;
    let h = new Set(Object.keys(r)),
      i = {};
    for (let [c, s] of Object.entries(T)) if (h.has(c)) {
      let A = r[c];
      i[c] = xL(s, A, `${a}.${c}`, e);
    } else e.push(`${a}.${c}`);
    return i;
  }
  return T;
}
function SmR(T) {
  try {
    return JSON.parse(T);
  } catch {
    return;
  }
}
function bq(T, R) {
  if (!T) return !1;
  if (typeof T === "string") return T === R;
  return T.includes(R);
}
function OmR(T, R, a) {
  if (!R || typeof T.args !== "object" || T.args === null) return T;
  let e = [],
    t = xL(T.args, R, "args", e);
  if (e.length > 0) J.info("[tool-service] Filtered extra arguments from tool call", {
    toolName: a,
    preFilterArgs: T.args,
    postFilterArgs: t,
    droppedPaths: e
  });
  return {
    ...T,
    args: t
  };
}
function FD(T) {
  if (T.status === "in-progress" || T.status === "done" || T.status === "cancelled" || T.status === "error") return T.progress;
  return;
}
function gN(T) {
  return !!T._zod;
}
function fl(T, R) {
  if (gN(T)) return XB(T, R);
  return T.safeParse(R);
}
function VLT(T) {
  if (!T) return;
  let R;
  if (gN(T)) R = T._zod?.def?.shape;else R = T.shape;
  if (!R) return;
  if (typeof R === "function") try {
    return R();
  } catch {
    return;
  }
  return R;
}
function BmR(T) {
  if (gN(T)) {
    let e = T._zod?.def;
    if (e) {
      if (e.value !== void 0) return e.value;
      if (Array.isArray(e.values) && e.values.length > 0) return e.values[0];
    }
  }
  let R = T._def;
  if (R) {
    if (R.value !== void 0) return R.value;
    if (Array.isArray(R.values) && R.values.length > 0) return R.values[0];
  }
  let a = T.value;
  if (a !== void 0) return a;
  return;
}
function qp(T) {
  return T === "completed" || T === "failed" || T === "cancelled";
}
function elT(T) {
  let R = VLT(T)?.method;
  if (!R) throw Error("Schema is missing a method literal");
  let a = BmR(R);
  if (typeof a !== "string") throw Error("Schema method literal must be a string");
  return a;
}
function tlT(T, R) {
  let a = fl(T, R);
  if (!a.success) throw a.error;
  return a.data;
}
class PMT {
  constructor(T) {
    if (this._options = T, this._requestMessageId = 0, this._requestHandlers = new Map(), this._requestHandlerAbortControllers = new Map(), this._notificationHandlers = new Map(), this._responseHandlers = new Map(), this._progressHandlers = new Map(), this._timeoutInfo = new Map(), this._pendingDebouncedNotifications = new Set(), this._taskProgressTokens = new Map(), this._requestResolvers = new Map(), this.setNotificationHandler(gL, R => {
      this._oncancel(R);
    }), this.setNotificationHandler(vL, R => {
      this._onprogress(R);
    }), this.setRequestHandler($L, R => ({})), this._taskStore = T?.taskStore, this._taskMessageQueue = T?.taskMessageQueue, this._taskStore) this.setRequestHandler(jL, async (R, a) => {
      let e = await this._taskStore.getTask(R.params.taskId, a.sessionId);
      if (!e) throw new l9(c9.InvalidParams, "Failed to retrieve task: Task not found");
      return {
        ...e
      };
    }), this.setRequestHandler(OL, async (R, a) => {
      let e = async () => {
        let t = R.params.taskId;
        if (this._taskMessageQueue) {
          let h;
          while (h = await this._taskMessageQueue.dequeue(t, a.sessionId)) {
            if (h.type === "response" || h.type === "error") {
              let i = h.message,
                c = i.id,
                s = this._requestResolvers.get(c);
              if (s) {
                if (this._requestResolvers.delete(c), h.type === "response") s(i);else {
                  let A = i,
                    l = new l9(A.error.code, A.error.message, A.error.data);
                  s(l);
                }
              } else {
                let A = h.type === "response" ? "Response" : "Error";
                this._onerror(Error(`${A} handler missing for request ${c}`));
              }
              continue;
            }
            await this._transport?.send(h.message, {
              relatedRequestId: a.requestId
            });
          }
        }
        let r = await this._taskStore.getTask(t, a.sessionId);
        if (!r) throw new l9(c9.InvalidParams, `Task not found: ${t}`);
        if (!qp(r.status)) return await this._waitForTaskUpdate(t, a.signal), await e();
        if (qp(r.status)) {
          let h = await this._taskStore.getTaskResult(t, a.sessionId);
          return this._clearTaskQueue(t), {
            ...h,
            _meta: {
              ...h._meta,
              [f_]: {
                taskId: t
              }
            }
          };
        }
        return await e();
      };
      return await e();
    }), this.setRequestHandler(dL, async (R, a) => {
      try {
        let {
          tasks: e,
          nextCursor: t
        } = await this._taskStore.listTasks(R.params?.cursor, a.sessionId);
        return {
          tasks: e,
          nextCursor: t,
          _meta: {}
        };
      } catch (e) {
        throw new l9(c9.InvalidParams, `Failed to list tasks: ${e instanceof Error ? e.message : String(e)}`);
      }
    }), this.setRequestHandler(CL, async (R, a) => {
      try {
        let e = await this._taskStore.getTask(R.params.taskId, a.sessionId);
        if (!e) throw new l9(c9.InvalidParams, `Task not found: ${R.params.taskId}`);
        if (qp(e.status)) throw new l9(c9.InvalidParams, `Cannot cancel task in terminal status: ${e.status}`);
        await this._taskStore.updateTaskStatus(R.params.taskId, "cancelled", "Client cancelled task execution.", a.sessionId), this._clearTaskQueue(R.params.taskId);
        let t = await this._taskStore.getTask(R.params.taskId, a.sessionId);
        if (!t) throw new l9(c9.InvalidParams, `Task not found after cancellation: ${R.params.taskId}`);
        return {
          _meta: {},
          ...t
        };
      } catch (e) {
        if (e instanceof l9) throw e;
        throw new l9(c9.InvalidRequest, `Failed to cancel task: ${e instanceof Error ? e.message : String(e)}`);
      }
    });
  }
  async _oncancel(T) {
    if (!T.params.requestId) return;
    this._requestHandlerAbortControllers.get(T.params.requestId)?.abort(T.params.reason);
  }
  _setupTimeout(T, R, a, e, t = !1) {
    this._timeoutInfo.set(T, {
      timeoutId: setTimeout(e, R),
      startTime: Date.now(),
      timeout: R,
      maxTotalTimeout: a,
      resetTimeoutOnProgress: t,
      onTimeout: e
    });
  }
  _resetTimeout(T) {
    let R = this._timeoutInfo.get(T);
    if (!R) return !1;
    let a = Date.now() - R.startTime;
    if (R.maxTotalTimeout && a >= R.maxTotalTimeout) throw this._timeoutInfo.delete(T), l9.fromError(c9.RequestTimeout, "Maximum total timeout exceeded", {
      maxTotalTimeout: R.maxTotalTimeout,
      totalElapsed: a
    });
    return clearTimeout(R.timeoutId), R.timeoutId = setTimeout(R.onTimeout, R.timeout), !0;
  }
  _cleanupTimeout(T) {
    let R = this._timeoutInfo.get(T);
    if (R) clearTimeout(R.timeoutId), this._timeoutInfo.delete(T);
  }
  async connect(T) {
    if (this._transport) throw Error("Already connected to a transport. Call close() before connecting to a new transport, or use a separate Protocol instance per connection.");
    this._transport = T;
    let R = this.transport?.onclose;
    this._transport.onclose = () => {
      R?.(), this._onclose();
    };
    let a = this.transport?.onerror;
    this._transport.onerror = t => {
      a?.(t), this._onerror(t);
    };
    let e = this._transport?.onmessage;
    this._transport.onmessage = (t, r) => {
      if (e?.(t, r), zg(t) || WmR(t)) this._onresponse(t);else if (cG(t)) this._onrequest(t, r);else if (HmR(t)) this._onnotification(t);else this._onerror(Error(`Unknown message type: ${JSON.stringify(t)}`));
    }, await this._transport.start();
  }
  _onclose() {
    let T = this._responseHandlers;
    this._responseHandlers = new Map(), this._progressHandlers.clear(), this._taskProgressTokens.clear(), this._pendingDebouncedNotifications.clear();
    for (let a of this._requestHandlerAbortControllers.values()) a.abort();
    this._requestHandlerAbortControllers.clear();
    let R = l9.fromError(c9.ConnectionClosed, "Connection closed");
    this._transport = void 0, this.onclose?.();
    for (let a of T.values()) a(R);
  }
  _onerror(T) {
    this.onerror?.(T);
  }
  _onnotification(T) {
    let R = this._notificationHandlers.get(T.method) ?? this.fallbackNotificationHandler;
    if (R === void 0) return;
    Promise.resolve().then(() => R(T)).catch(a => this._onerror(Error(`Uncaught error in notification handler: ${a}`)));
  }
  _onrequest(T, R) {
    let a = this._requestHandlers.get(T.method) ?? this.fallbackRequestHandler,
      e = this._transport,
      t = T.params?._meta?.[f_]?.taskId;
    if (a === void 0) {
      let s = {
        jsonrpc: "2.0",
        id: T.id,
        error: {
          code: c9.MethodNotFound,
          message: "Method not found"
        }
      };
      if (t && this._taskMessageQueue) this._enqueueTaskMessage(t, {
        type: "error",
        message: s,
        timestamp: Date.now()
      }, e?.sessionId).catch(A => this._onerror(Error(`Failed to enqueue error response: ${A}`)));else e?.send(s).catch(A => this._onerror(Error(`Failed to send an error response: ${A}`)));
      return;
    }
    let r = new AbortController();
    this._requestHandlerAbortControllers.set(T.id, r);
    let h = UmR(T.params) ? T.params.task : void 0,
      i = this._taskStore ? this.requestTaskStore(T, e?.sessionId) : void 0,
      c = {
        signal: r.signal,
        sessionId: e?.sessionId,
        _meta: T.params?._meta,
        sendNotification: async s => {
          if (r.signal.aborted) return;
          let A = {
            relatedRequestId: T.id
          };
          if (t) A.relatedTask = {
            taskId: t
          };
          await this.notification(s, A);
        },
        sendRequest: async (s, A, l) => {
          if (r.signal.aborted) throw new l9(c9.ConnectionClosed, "Request was cancelled");
          let o = {
            ...l,
            relatedRequestId: T.id
          };
          if (t && !o.relatedTask) o.relatedTask = {
            taskId: t
          };
          let n = o.relatedTask?.taskId ?? t;
          if (n && i) await i.updateTaskStatus(n, "input_required");
          return await this.request(s, A, o);
        },
        authInfo: R?.authInfo,
        requestId: T.id,
        requestInfo: R?.requestInfo,
        taskId: t,
        taskStore: i,
        taskRequestedTtl: h?.ttl,
        closeSSEStream: R?.closeSSEStream,
        closeStandaloneSSEStream: R?.closeStandaloneSSEStream
      };
    Promise.resolve().then(() => {
      if (h) this.assertTaskHandlerCapability(T.method);
    }).then(() => a(T, c)).then(async s => {
      if (r.signal.aborted) return;
      let A = {
        result: s,
        jsonrpc: "2.0",
        id: T.id
      };
      if (t && this._taskMessageQueue) await this._enqueueTaskMessage(t, {
        type: "response",
        message: A,
        timestamp: Date.now()
      }, e?.sessionId);else await e?.send(A);
    }, async s => {
      if (r.signal.aborted) return;
      let A = {
        jsonrpc: "2.0",
        id: T.id,
        error: {
          code: Number.isSafeInteger(s.code) ? s.code : c9.InternalError,
          message: s.message ?? "Internal error",
          ...(s.data !== void 0 && {
            data: s.data
          })
        }
      };
      if (t && this._taskMessageQueue) await this._enqueueTaskMessage(t, {
        type: "error",
        message: A,
        timestamp: Date.now()
      }, e?.sessionId);else await e?.send(A);
    }).catch(s => this._onerror(Error(`Failed to send response: ${s}`))).finally(() => {
      this._requestHandlerAbortControllers.delete(T.id);
    });
  }
  _onprogress(T) {
    let {
        progressToken: R,
        ...a
      } = T.params,
      e = Number(R),
      t = this._progressHandlers.get(e);
    if (!t) {
      this._onerror(Error(`Received a progress notification for an unknown token: ${JSON.stringify(T)}`));
      return;
    }
    let r = this._responseHandlers.get(e),
      h = this._timeoutInfo.get(e);
    if (h && r && h.resetTimeoutOnProgress) try {
      this._resetTimeout(e);
    } catch (i) {
      this._responseHandlers.delete(e), this._progressHandlers.delete(e), this._cleanupTimeout(e), r(i);
      return;
    }
    t(a);
  }
  _onresponse(T) {
    let R = Number(T.id),
      a = this._requestResolvers.get(R);
    if (a) {
      if (this._requestResolvers.delete(R), zg(T)) a(T);else {
        let r = new l9(T.error.code, T.error.message, T.error.data);
        a(r);
      }
      return;
    }
    let e = this._responseHandlers.get(R);
    if (e === void 0) {
      this._onerror(Error(`Received a response for an unknown message ID: ${JSON.stringify(T)}`));
      return;
    }
    this._responseHandlers.delete(R), this._cleanupTimeout(R);
    let t = !1;
    if (zg(T) && T.result && typeof T.result === "object") {
      let r = T.result;
      if (r.task && typeof r.task === "object") {
        let h = r.task;
        if (typeof h.taskId === "string") t = !0, this._taskProgressTokens.set(h.taskId, R);
      }
    }
    if (!t) this._progressHandlers.delete(R);
    if (zg(T)) e(T);else {
      let r = l9.fromError(T.error.code, T.error.message, T.error.data);
      e(r);
    }
  }
  get transport() {
    return this._transport;
  }
  async close() {
    await this._transport?.close();
  }
  async *requestStream(T, R, a) {
    let {
      task: e
    } = a ?? {};
    if (!e) {
      try {
        yield {
          type: "result",
          result: await this.request(T, R, a)
        };
      } catch (r) {
        yield {
          type: "error",
          error: r instanceof l9 ? r : new l9(c9.InternalError, String(r))
        };
      }
      return;
    }
    let t;
    try {
      let r = await this.request(T, jP, a);
      if (r.task) t = r.task.taskId, yield {
        type: "taskCreated",
        task: r.task
      };else throw new l9(c9.InternalError, "Task creation did not return a task");
      while (!0) {
        let h = await this.getTask({
          taskId: t
        }, a);
        if (yield {
          type: "taskStatus",
          task: h
        }, qp(h.status)) {
          if (h.status === "completed") yield {
            type: "result",
            result: await this.getTaskResult({
              taskId: t
            }, R, a)
          };else if (h.status === "failed") yield {
            type: "error",
            error: new l9(c9.InternalError, `Task ${t} failed`)
          };else if (h.status === "cancelled") yield {
            type: "error",
            error: new l9(c9.InternalError, `Task ${t} was cancelled`)
          };
          return;
        }
        if (h.status === "input_required") {
          yield {
            type: "result",
            result: await this.getTaskResult({
              taskId: t
            }, R, a)
          };
          return;
        }
        let i = h.pollInterval ?? this._options?.defaultTaskPollInterval ?? 1000;
        await new Promise(c => setTimeout(c, i)), a?.signal?.throwIfAborted();
      }
    } catch (r) {
      yield {
        type: "error",
        error: r instanceof l9 ? r : new l9(c9.InternalError, String(r))
      };
    }
  }
  request(T, R, a) {
    let {
      relatedRequestId: e,
      resumptionToken: t,
      onresumptiontoken: r,
      task: h,
      relatedTask: i
    } = a ?? {};
    return new Promise((c, s) => {
      let A = b => {
        s(b);
      };
      if (!this._transport) {
        A(Error("Not connected"));
        return;
      }
      if (this._options?.enforceStrictCapabilities === !0) try {
        if (this.assertCapabilityForMethod(T.method), h) this.assertTaskCapability(T.method);
      } catch (b) {
        A(b);
        return;
      }
      a?.signal?.throwIfAborted();
      let l = this._requestMessageId++,
        o = {
          ...T,
          jsonrpc: "2.0",
          id: l
        };
      if (a?.onprogress) this._progressHandlers.set(l, a.onprogress), o.params = {
        ...T.params,
        _meta: {
          ...(T.params?._meta || {}),
          progressToken: l
        }
      };
      if (h) o.params = {
        ...o.params,
        task: h
      };
      if (i) o.params = {
        ...o.params,
        _meta: {
          ...(o.params?._meta || {}),
          [f_]: i
        }
      };
      let n = b => {
        this._responseHandlers.delete(l), this._progressHandlers.delete(l), this._cleanupTimeout(l), this._transport?.send({
          jsonrpc: "2.0",
          method: "notifications/cancelled",
          params: {
            requestId: l,
            reason: String(b)
          }
        }, {
          relatedRequestId: e,
          resumptionToken: t,
          onresumptiontoken: r
        }).catch(u => this._onerror(Error(`Failed to send cancellation: ${u}`)));
        let y = b instanceof l9 ? b : new l9(c9.RequestTimeout, String(b));
        s(y);
      };
      this._responseHandlers.set(l, b => {
        if (a?.signal?.aborted) return;
        if (b instanceof Error) return s(b);
        try {
          let y = fl(R, b.result);
          if (!y.success) s(y.error);else c(y.data);
        } catch (y) {
          s(y);
        }
      }), a?.signal?.addEventListener("abort", () => {
        n(a?.signal?.reason);
      });
      let p = a?.timeout ?? ruR,
        _ = () => n(l9.fromError(c9.RequestTimeout, "Request timed out", {
          timeout: p
        }));
      this._setupTimeout(l, p, a?.maxTotalTimeout, _, a?.resetTimeoutOnProgress ?? !1);
      let m = i?.taskId;
      if (m) {
        let b = y => {
          let u = this._responseHandlers.get(l);
          if (u) u(y);else this._onerror(Error(`Response handler missing for side-channeled request ${l}`));
        };
        this._requestResolvers.set(l, b), this._enqueueTaskMessage(m, {
          type: "request",
          message: o,
          timestamp: Date.now()
        }).catch(y => {
          this._cleanupTimeout(l), s(y);
        });
      } else this._transport.send(o, {
        relatedRequestId: e,
        resumptionToken: t,
        onresumptiontoken: r
      }).catch(b => {
        this._cleanupTimeout(l), s(b);
      });
    });
  }
  async getTask(T, R) {
    return this.request({
      method: "tasks/get",
      params: T
    }, SL, R);
  }
  async getTaskResult(T, R, a) {
    return this.request({
      method: "tasks/result",
      params: T
    }, R, a);
  }
  async listTasks(T, R) {
    return this.request({
      method: "tasks/list",
      params: T
    }, EL, R);
  }
  async cancelTask(T, R) {
    return this.request({
      method: "tasks/cancel",
      params: T
    }, YLT, R);
  }
  async notification(T, R) {
    if (!this._transport) throw Error("Not connected");
    this.assertNotificationCapability(T.method);
    let a = R?.relatedTask?.taskId;
    if (a) {
      let t = {
        ...T,
        jsonrpc: "2.0",
        params: {
          ...T.params,
          _meta: {
            ...(T.params?._meta || {}),
            [f_]: R.relatedTask
          }
        }
      };
      await this._enqueueTaskMessage(a, {
        type: "notification",
        message: t,
        timestamp: Date.now()
      });
      return;
    }
    if ((this._options?.debouncedNotificationMethods ?? []).includes(T.method) && !T.params && !R?.relatedRequestId && !R?.relatedTask) {
      if (this._pendingDebouncedNotifications.has(T.method)) return;
      this._pendingDebouncedNotifications.add(T.method), Promise.resolve().then(() => {
        if (this._pendingDebouncedNotifications.delete(T.method), !this._transport) return;
        let t = {
          ...T,
          jsonrpc: "2.0"
        };
        if (R?.relatedTask) t = {
          ...t,
          params: {
            ...t.params,
            _meta: {
              ...(t.params?._meta || {}),
              [f_]: R.relatedTask
            }
          }
        };
        this._transport?.send(t, R).catch(r => this._onerror(r));
      });
      return;
    }
    let e = {
      ...T,
      jsonrpc: "2.0"
    };
    if (R?.relatedTask) e = {
      ...e,
      params: {
        ...e.params,
        _meta: {
          ...(e.params?._meta || {}),
          [f_]: R.relatedTask
        }
      }
    };
    await this._transport.send(e, R);
  }
  setRequestHandler(T, R) {
    let a = elT(T);
    this.assertRequestHandlerCapability(a), this._requestHandlers.set(a, (e, t) => {
      let r = tlT(T, e);
      return Promise.resolve(R(r, t));
    });
  }
  removeRequestHandler(T) {
    this._requestHandlers.delete(T);
  }
  assertCanSetRequestHandler(T) {
    if (this._requestHandlers.has(T)) throw Error(`A request handler for ${T} already exists, which would be overridden`);
  }
  setNotificationHandler(T, R) {
    let a = elT(T);
    this._notificationHandlers.set(a, e => {
      let t = tlT(T, e);
      return Promise.resolve(R(t));
    });
  }
  removeNotificationHandler(T) {
    this._notificationHandlers.delete(T);
  }
  _cleanupTaskProgressHandler(T) {
    let R = this._taskProgressTokens.get(T);
    if (R !== void 0) this._progressHandlers.delete(R), this._taskProgressTokens.delete(T);
  }
  async _enqueueTaskMessage(T, R, a) {
    if (!this._taskStore || !this._taskMessageQueue) throw Error("Cannot enqueue task message: taskStore and taskMessageQueue are not configured");
    let e = this._options?.maxTaskQueueSize;
    await this._taskMessageQueue.enqueue(T, R, a, e);
  }
  async _clearTaskQueue(T, R) {
    if (this._taskMessageQueue) {
      let a = await this._taskMessageQueue.dequeueAll(T, R);
      for (let e of a) if (e.type === "request" && cG(e.message)) {
        let t = e.message.id,
          r = this._requestResolvers.get(t);
        if (r) r(new l9(c9.InternalError, "Task cancelled or completed")), this._requestResolvers.delete(t);else this._onerror(Error(`Resolver missing for request ${t} during task ${T} cleanup`));
      }
    }
  }
  async _waitForTaskUpdate(T, R) {
    let a = this._options?.defaultTaskPollInterval ?? 1000;
    try {
      let e = await this._taskStore?.getTask(T);
      if (e?.pollInterval) a = e.pollInterval;
    } catch {}
    return new Promise((e, t) => {
      if (R.aborted) {
        t(new l9(c9.InvalidRequest, "Request cancelled"));
        return;
      }
      let r = setTimeout(e, a);
      R.addEventListener("abort", () => {
        clearTimeout(r), t(new l9(c9.InvalidRequest, "Request cancelled"));
      }, {
        once: !0
      });
    });
  }
  requestTaskStore(T, R) {
    let a = this._taskStore;
    if (!a) throw Error("No task store configured");
    return {
      createTask: async e => {
        if (!T) throw Error("No request provided");
        return await a.createTask(e, T.id, {
          method: T.method,
          params: T.params
        }, R);
      },
      getTask: async e => {
        let t = await a.getTask(e, R);
        if (!t) throw new l9(c9.InvalidParams, "Failed to retrieve task: Task not found");
        return t;
      },
      storeTaskResult: async (e, t, r) => {
        await a.storeTaskResult(e, t, r, R);
        let h = await a.getTask(e, R);
        if (h) {
          let i = W$.parse({
            method: "notifications/tasks/status",
            params: h
          });
          if (await this.notification(i), qp(h.status)) this._cleanupTaskProgressHandler(e);
        }
      },
      getTaskResult: e => {
        return a.getTaskResult(e, R);
      },
      updateTaskStatus: async (e, t, r) => {
        let h = await a.getTask(e, R);
        if (!h) throw new l9(c9.InvalidParams, `Task "${e}" not found - it may have been cleaned up`);
        if (qp(h.status)) throw new l9(c9.InvalidParams, `Cannot update task "${e}" from terminal status "${h.status}" to "${t}". Terminal states (completed, failed, cancelled) cannot transition to other states.`);
        await a.updateTaskStatus(e, t, r, R);
        let i = await a.getTask(e, R);
        if (i) {
          let c = W$.parse({
            method: "notifications/tasks/status",
            params: i
          });
          if (await this.notification(c), qp(i.status)) this._cleanupTaskProgressHandler(e);
        }
      },
      listTasks: e => {
        return a.listTasks(e, R);
      }
    };
  }
}
function rlT(T) {
  return T !== null && typeof T === "object" && !Array.isArray(T);
}
function tuR(T, R) {
  let a = {
    ...T
  };
  for (let e in R) {
    let t = e,
      r = R[t];
    if (r === void 0) continue;
    let h = a[t];
    if (rlT(h) && rlT(r)) a[t] = {
      ...h,
      ...r
    };else a[t] = r;
  }
  return a;
}
function XuR() {
  let T = new MMT.default({
    strict: !1,
    validateFormats: !0,
    validateSchema: !1,
    allErrors: !0
  });
  return DMT.default(T), T;
}
class LMT {
  constructor(T) {
    this._ajv = T ?? XuR();
  }
  getValidator(T) {
    let R = "$id" in T && typeof T.$id === "string" ? this._ajv.getSchema(T.$id) ?? this._ajv.compile(T) : this._ajv.compile(T);
    return a => {
      if (R(a)) return {
        valid: !0,
        data: a,
        errorMessage: void 0
      };else return {
        valid: !1,
        data: void 0,
        errorMessage: this._ajv.errorsText(R.errors)
      };
    };
  }
}
class wMT {
  constructor(T) {
    this._client = T;
  }
  async *callToolStream(T, R = q$, a) {
    let e = this._client,
      t = {
        ...a,
        task: a?.task ?? (e.isToolTask(T.name) ? {} : void 0)
      },
      r = e.requestStream({
        method: "tools/call",
        params: T
      }, R, t),
      h = e.getToolOutputValidator(T.name);
    for await (let i of r) {
      if (i.type === "result" && h) {
        let c = i.result;
        if (!c.structuredContent && !c.isError) {
          yield {
            type: "error",
            error: new l9(c9.InvalidRequest, `Tool ${T.name} has an output schema but did not return structured content`)
          };
          return;
        }
        if (c.structuredContent) try {
          let s = h(c.structuredContent);
          if (!s.valid) {
            yield {
              type: "error",
              error: new l9(c9.InvalidParams, `Structured content does not match the tool's output schema: ${s.errorMessage}`)
            };
            return;
          }
        } catch (s) {
          if (s instanceof l9) {
            yield {
              type: "error",
              error: s
            };
            return;
          }
          yield {
            type: "error",
            error: new l9(c9.InvalidParams, `Failed to validate structured content: ${s instanceof Error ? s.message : String(s)}`)
          };
          return;
        }
      }
      yield i;
    }
  }
  async getTask(T, R) {
    return this._client.getTask({
      taskId: T
    }, R);
  }
  async getTaskResult(T, R, a) {
    return this._client.getTaskResult({
      taskId: T
    }, R, a);
  }
  async listTasks(T, R) {
    return this._client.listTasks(T ? {
      cursor: T
    } : void 0, R);
  }
  async cancelTask(T, R) {
    return this._client.cancelTask({
      taskId: T
    }, R);
  }
  requestStream(T, R, a) {
    return this._client.requestStream(T, R, a);
  }
}
function ZuR(T, R, a) {
  if (!T) throw Error(`${a} does not support task creation (required for ${R})`);
  switch (R) {
    case "tools/call":
      if (!T.tools?.call) throw Error(`${a} does not support task creation for tools/call (required for ${R})`);
      break;
    default:
      break;
  }
}
function JuR(T, R, a) {
  if (!T) throw Error(`${a} does not support task creation (required for ${R})`);
  switch (R) {
    case "sampling/createMessage":
      if (!T.sampling?.createMessage) throw Error(`${a} does not support task creation for sampling/createMessage (required for ${R})`);
      break;
    case "elicitation/create":
      if (!T.elicitation?.create) throw Error(`${a} does not support task creation for elicitation/create (required for ${R})`);
      break;
    default:
      break;
  }
}
function LL(T, R) {
  if (!T || R === null || typeof R !== "object") return;
  if (T.type === "object" && T.properties && typeof T.properties === "object") {
    let a = R,
      e = T.properties;
    for (let t of Object.keys(e)) {
      let r = e[t];
      if (a[t] === void 0 && Object.prototype.hasOwnProperty.call(r, "default")) a[t] = r.default;
      if (a[t] !== void 0) LL(r, a[t]);
    }
  }
  if (Array.isArray(T.anyOf)) {
    for (let a of T.anyOf) if (typeof a !== "boolean") LL(a, R);
  }
  if (Array.isArray(T.oneOf)) {
    for (let a of T.oneOf) if (typeof a !== "boolean") LL(a, R);
  }
}
function TyR(T) {
  if (!T) return {
    supportsFormMode: !1,
    supportsUrlMode: !1
  };
  let R = T.form !== void 0,
    a = T.url !== void 0;
  return {
    supportsFormMode: R || !R && !a,
    supportsUrlMode: a
  };
}
function $q(T) {}
function NMT(T) {
  if (typeof T == "function") throw TypeError("`callbacks` must be an object, got a function instead. Did you mean `{onEvent: fn}`?");
  let {
      onEvent: R = $q,
      onError: a = $q,
      onRetry: e = $q,
      onComment: t
    } = T,
    r = "",
    h = !0,
    i,
    c = "",
    s = "";
  function A(_) {
    let m = h ? _.replace(/^\xEF\xBB\xBF/, "") : _,
      [b, y] = RyR(`${r}${m}`);
    for (let u of b) l(u);
    r = y, h = !1;
  }
  function l(_) {
    if (_ === "") {
      n();
      return;
    }
    if (_.startsWith(":")) {
      t && t(_.slice(_.startsWith(": ") ? 2 : 1));
      return;
    }
    let m = _.indexOf(":");
    if (m !== -1) {
      let b = _.slice(0, m),
        y = _[m + 1] === " " ? 2 : 1,
        u = _.slice(m + y);
      o(b, u, _);
      return;
    }
    o(_, "", _);
  }
  function o(_, m, b) {
    switch (_) {
      case "event":
        s = m;
        break;
      case "data":
        c = `${c}${m}
`;
        break;
      case "id":
        i = m.includes("\x00") ? void 0 : m;
        break;
      case "retry":
        /^\d+$/.test(m) ? e(parseInt(m, 10)) : a(new IG(`Invalid \`retry\` value: "${m}"`, {
          type: "invalid-retry",
          value: m,
          line: b
        }));
        break;
      default:
        a(new IG(`Unknown field "${_.length > 20 ? `${_.slice(0, 20)}\u2026` : _}"`, {
          type: "unknown-field",
          field: _,
          value: m,
          line: b
        }));
        break;
    }
  }
  function n() {
    c.length > 0 && R({
      id: i,
      event: s || void 0,
      data: c.endsWith(`
`) ? c.slice(0, -1) : c
    }), i = void 0, c = "", s = "";
  }
  function p(_ = {}) {
    r && _.consume && l(r), h = !0, i = void 0, c = "", s = "", r = "";
  }
  return {
    feed: A,
    reset: p
  };
}
function RyR(T) {
  let R = [],
    a = "",
    e = 0;
  for (; e < T.length;) {
    let t = T.indexOf("\r", e),
      r = T.indexOf(`
`, e),
      h = -1;
    if (t !== -1 && r !== -1 ? h = Math.min(t, r) : t !== -1 ? t === T.length - 1 ? h = -1 : h = t : r !== -1 && (h = r), h === -1) {
      a = T.slice(e);
      break;
    } else {
      let i = T.slice(e, h);
      R.push(i), e = h + 1, T[e - 1] === "\r" && T[e] === `
` && e++;
    }
  }
  return [R, a];
}
function ayR(T) {
  let R = globalThis.DOMException;
  return typeof R == "function" ? new R(T, "SyntaxError") : SyntaxError(T);
}
function gG(T) {
  return T instanceof Error ? "errors" in T && Array.isArray(T.errors) ? T.errors.map(gG).join(", ") : "cause" in T && T.cause instanceof Error ? `${T}: ${gG(T.cause)}` : T.message : `${T}`;
}
function ilT(T) {
  return {
    type: T.type,
    message: T.message,
    code: T.code,
    defaultPrevented: T.defaultPrevented,
    cancelable: T.cancelable,
    timeStamp: T.timeStamp
  };
}
function eyR() {
  let T = "document" in globalThis ? globalThis.document : void 0;
  return T && typeof T == "object" && "baseURI" in T && typeof T.baseURI == "string" ? T.baseURI : void 0;
}
function QD(T) {
  if (!T) return {};
  if (T instanceof Headers) return Object.fromEntries(T.entries());
  if (Array.isArray(T)) return Object.fromEntries(T);
  return {
    ...T
  };
}
function WMT(T = fetch, R) {
  if (!R) return T;
  return async (a, e) => {
    let t = {
      ...R,
      ...e,
      headers: e?.headers ? {
        ...QD(R.headers),
        ...QD(e.headers)
      } : R.headers
    };
    return T(a, t);
  };
}
async function ryR(T) {
  return (await w9T).getRandomValues(new Uint8Array(T));
}
async function hyR(T) {
  let R = Math.pow(2, 8) - Math.pow(2, 8) % 66,
    a = "";
  while (a.length < T) {
    let e = await ryR(T - a.length);
    for (let t of e) if (t < R) a += "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~"[t % 66];
  }
  return a;
}
async function iyR(T) {
  return await hyR(T);
}
async function cyR(T) {
  let R = await (await w9T).subtle.digest("SHA-256", new TextEncoder().encode(T));
  return btoa(String.fromCharCode(...new Uint8Array(R))).replace(/\//g, "_").replace(/\+/g, "-").replace(/=/g, "");
}
async function syR(T) {
  if (!T) T = 43;
  if (T < 43 || T > 128) throw `Expected a length between 43 and 128. Received ${T}.`;
  let R = await iyR(T),
    a = await cyR(R);
  return {
    code_verifier: R,
    code_challenge: a
  };
}
function AyR(T) {
  let R = typeof T === "string" ? new URL(T) : new URL(T.href);
  return R.hash = "", R;
}
function pyR({
  requestedResource: T,
  configuredResource: R
}) {
  let a = typeof T === "string" ? new URL(T) : new URL(T.href),
    e = typeof R === "string" ? new URL(R) : new URL(R.href);
  if (a.origin !== e.origin) return !1;
  if (a.pathname.length < e.pathname.length) return !1;
  let t = a.pathname.endsWith("/") ? a.pathname : a.pathname + "/",
    r = e.pathname.endsWith("/") ? e.pathname : e.pathname + "/";
  return t.startsWith(r);
}
function byR(T) {
  return ["client_secret_basic", "client_secret_post", "none"].includes(T);
}
function myR(T, R) {
  let a = T.client_secret !== void 0;
  if (R.length === 0) return a ? "client_secret_post" : "none";
  if ("token_endpoint_auth_method" in T && T.token_endpoint_auth_method && byR(T.token_endpoint_auth_method) && R.includes(T.token_endpoint_auth_method)) return T.token_endpoint_auth_method;
  if (a && R.includes("client_secret_basic")) return "client_secret_basic";
  if (a && R.includes("client_secret_post")) return "client_secret_post";
  if (R.includes("none")) return "none";
  return a ? "client_secret_post" : "none";
}
function uyR(T, R, a, e) {
  let {
    client_id: t,
    client_secret: r
  } = R;
  switch (T) {
    case "client_secret_basic":
      yyR(t, r, a);
      return;
    case "client_secret_post":
      PyR(t, r, e);
      return;
    case "none":
      kyR(t, e);
      return;
    default:
      throw Error(`Unsupported client authentication method: ${T}`);
  }
}
function yyR(T, R, a) {
  if (!R) throw Error("client_secret_basic authentication requires a client_secret");
  let e = btoa(`${T}:${R}`);
  a.set("Authorization", `Basic ${e}`);
}
function PyR(T, R, a) {
  if (a.set("client_id", T), R) a.set("client_secret", R);
}
function kyR(T, R) {
  R.set("client_id", T);
}
async function XMT(T) {
  let R = T instanceof Response ? T.status : void 0,
    a = T instanceof Response ? await T.text() : T;
  try {
    let e = GMT.parse(JSON.parse(a)),
      {
        error: t,
        error_description: r,
        error_uri: h
      } = e;
    return new (VMT[t] || Y_)(r || "", h);
  } catch (e) {
    let t = `${R ? `HTTP ${R}: ` : ""}Invalid OAuth error response: ${e}. Raw body: ${a}`;
    return new Y_(t);
  }
}
async function Q_(T, R) {
  try {
    return await Dq(T, R);
  } catch (a) {
    if (a instanceof Gg || a instanceof Vg) return await T.invalidateCredentials?.("all"), await Dq(T, R);else if (a instanceof Kg) return await T.invalidateCredentials?.("tokens"), await Dq(T, R);
    throw a;
  }
}
async function Dq(T, {
  serverUrl: R,
  authorizationCode: a,
  scope: e,
  resourceMetadataUrl: t,
  fetchFn: r
}) {
  let h, i;
  try {
    if (h = await IyR(R, {
      resourceMetadataUrl: t
    }, r), h.authorization_servers && h.authorization_servers.length > 0) i = h.authorization_servers[0];
  } catch {}
  if (!i) i = new URL("/", R);
  let c = await fyR(R, T, h),
    s = await SyR(i, {
      fetchFn: r
    }),
    A = await Promise.resolve(T.clientInformation());
  if (!A) {
    if (a !== void 0) throw Error("Existing OAuth client information is required when exchanging an authorization code");
    let m = s?.client_id_metadata_document_supported === !0,
      b = T.clientMetadataUrl;
    if (b && !xyR(b)) throw new Xg(`clientMetadataUrl must be a valid HTTPS URL with a non-root pathname, got: ${b}`);
    if (m && b) A = {
      client_id: b
    }, await T.saveClientInformation?.(A);else {
      if (!T.saveClientInformation) throw Error("OAuth client information must be saveable for dynamic registration");
      let y = await LyR(i, {
        metadata: s,
        clientMetadata: T.clientMetadata,
        fetchFn: r
      });
      await T.saveClientInformation(y), A = y;
    }
  }
  let l = !T.redirectUrl;
  if (a !== void 0 || l) {
    let m = await CyR(T, i, {
      metadata: s,
      resource: c,
      authorizationCode: a,
      fetchFn: r
    });
    return await T.saveTokens(m), "AUTHORIZED";
  }
  let o = await T.tokens();
  if (o?.refresh_token) try {
    let m = await EyR(i, {
      metadata: s,
      clientInformation: A,
      refreshToken: o.refresh_token,
      resource: c,
      addClientAuthentication: T.addClientAuthentication,
      fetchFn: r
    });
    return await T.saveTokens(m), "AUTHORIZED";
  } catch (m) {
    if (!(m instanceof Na) || m instanceof Y_) ;else throw m;
  }
  let n = T.state ? await T.state() : void 0,
    {
      authorizationUrl: p,
      codeVerifier: _
    } = await OyR(i, {
      metadata: s,
      clientInformation: A,
      state: n,
      redirectUrl: T.redirectUrl,
      scope: e || h?.scopes_supported?.join(" ") || T.clientMetadata.scope,
      resource: c
    });
  return await T.saveCodeVerifier(_), await T.redirectToAuthorization(p), "REDIRECT";
}
function xyR(T) {
  if (!T) return !1;
  try {
    let R = new URL(T);
    return R.protocol === "https:" && R.pathname !== "/";
  } catch {
    return !1;
  }
}
async function fyR(T, R, a) {
  let e = AyR(T);
  if (R.validateResourceURL) return await R.validateResourceURL(e, a?.resource);
  if (!a) return;
  if (!pyR({
    requestedResource: e,
    configuredResource: a.resource
  })) throw Error(`Protected resource ${a.resource} does not match expected ${e} (or origin)`);
  return new URL(a.resource);
}
function ZD(T) {
  let R = T.headers.get("WWW-Authenticate");
  if (!R) return {};
  let [a, e] = R.split(" ");
  if (a.toLowerCase() !== "bearer" || !e) return {};
  let t = wq(T, "resource_metadata") || void 0,
    r;
  if (t) try {
    r = new URL(t);
  } catch {}
  let h = wq(T, "scope") || void 0,
    i = wq(T, "error") || void 0;
  return {
    resourceMetadataUrl: r,
    scope: h,
    error: i
  };
}
function wq(T, R) {
  let a = T.headers.get("WWW-Authenticate");
  if (!a) return null;
  let e = new RegExp(`${R}=(?:"([^"]+)"|([^\\s,]+))`),
    t = a.match(e);
  if (t) return t[1] || t[2];
  return null;
}
async function IyR(T, R, a = fetch) {
  let e = await vyR(T, "oauth-protected-resource", a, {
    protocolVersion: R?.protocolVersion,
    metadataUrl: R?.resourceMetadataUrl
  });
  if (!e || e.status === 404) throw await e?.body?.cancel(), Error("Resource server does not implement OAuth 2.0 Protected Resource Metadata.");
  if (!e.ok) throw await e.body?.cancel(), Error(`HTTP ${e.status} trying to load well-known OAuth protected resource metadata.`);
  return qMT.parse(await e.json());
}
async function B9T(T, R, a = fetch) {
  try {
    return await a(T, {
      headers: R
    });
  } catch (e) {
    if (e instanceof TypeError) if (R) return B9T(T, void 0, a);else return;
    throw e;
  }
}
function gyR(T, R = "", a = {}) {
  if (R.endsWith("/")) R = R.slice(0, -1);
  return a.prependPathname ? `${R}/.well-known/${T}` : `/.well-known/${T}${R}`;
}
async function AlT(T, R, a = fetch) {
  return await B9T(T, {
    "MCP-Protocol-Version": R
  }, a);
}
function $yR(T, R) {
  return !T || T.status >= 400 && T.status < 500 && R !== "/";
}
async function vyR(T, R, a, e) {
  let t = new URL(T),
    r = e?.protocolVersion ?? $N,
    h;
  if (e?.metadataUrl) h = new URL(e.metadataUrl);else {
    let c = gyR(R, t.pathname);
    h = new URL(c, e?.metadataServerUrl ?? t), h.search = t.search;
  }
  let i = await AlT(h, r, a);
  if (!e?.metadataUrl && $yR(i, t.pathname)) {
    let c = new URL(`/.well-known/${R}`, t);
    i = await AlT(c, r, a);
  }
  return i;
}
function jyR(T) {
  let R = typeof T === "string" ? new URL(T) : T,
    a = R.pathname !== "/",
    e = [];
  if (!a) return e.push({
    url: new URL("/.well-known/oauth-authorization-server", R.origin),
    type: "oauth"
  }), e.push({
    url: new URL("/.well-known/openid-configuration", R.origin),
    type: "oidc"
  }), e;
  let t = R.pathname;
  if (t.endsWith("/")) t = t.slice(0, -1);
  return e.push({
    url: new URL(`/.well-known/oauth-authorization-server${t}`, R.origin),
    type: "oauth"
  }), e.push({
    url: new URL(`/.well-known/openid-configuration${t}`, R.origin),
    type: "oidc"
  }), e.push({
    url: new URL(`${t}/.well-known/openid-configuration`, R.origin),
    type: "oidc"
  }), e;
}
async function SyR(T, {
  fetchFn: R = fetch,
  protocolVersion: a = $N
} = {}) {
  let e = {
      "MCP-Protocol-Version": a,
      Accept: "application/json"
    },
    t = jyR(T);
  for (let {
    url: r,
    type: h
  } of t) {
    let i = await B9T(r, e, R);
    if (!i) continue;
    if (!i.ok) {
      if (await i.body?.cancel(), i.status >= 400 && i.status < 500) continue;
      throw Error(`HTTP ${i.status} trying to load ${h === "oauth" ? "OAuth" : "OpenID provider"} metadata from ${r}`);
    }
    if (h === "oauth") return $G.parse(await i.json());else return zMT.parse(await i.json());
  }
  return;
}
async function OyR(T, {
  metadata: R,
  clientInformation: a,
  redirectUrl: e,
  scope: t,
  state: r,
  resource: h
}) {
  let i;
  if (R) {
    if (i = new URL(R.authorization_endpoint), !R.response_types_supported.includes(Bq)) throw Error(`Incompatible auth server: does not support response type ${Bq}`);
    if (R.code_challenge_methods_supported && !R.code_challenge_methods_supported.includes(Nq)) throw Error(`Incompatible auth server: does not support code challenge method ${Nq}`);
  } else i = new URL("/authorize", T);
  let c = await syR(),
    s = c.code_verifier,
    A = c.code_challenge;
  if (i.searchParams.set("response_type", Bq), i.searchParams.set("client_id", a.client_id), i.searchParams.set("code_challenge", A), i.searchParams.set("code_challenge_method", Nq), i.searchParams.set("redirect_uri", String(e)), r) i.searchParams.set("state", r);
  if (t) i.searchParams.set("scope", t);
  if (t?.includes("offline_access")) i.searchParams.append("prompt", "consent");
  if (h) i.searchParams.set("resource", h.href);
  return {
    authorizationUrl: i,
    codeVerifier: s
  };
}
function dyR(T, R, a) {
  return new URLSearchParams({
    grant_type: "authorization_code",
    code: T,
    code_verifier: R,
    redirect_uri: String(a)
  });
}
async function YMT(T, {
  metadata: R,
  tokenRequestParams: a,
  clientInformation: e,
  addClientAuthentication: t,
  resource: r,
  fetchFn: h
}) {
  let i = R?.token_endpoint ? new URL(R.token_endpoint) : new URL("/token", T),
    c = new Headers({
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    });
  if (r) a.set("resource", r.href);
  if (t) await t(c, a, i, R);else if (e) {
    let A = R?.token_endpoint_auth_methods_supported ?? [],
      l = myR(e, A);
    uyR(l, e, c, a);
  }
  let s = await (h ?? fetch)(i, {
    method: "POST",
    headers: c,
    body: a
  });
  if (!s.ok) throw await XMT(s);
  return FMT.parse(await s.json());
}
async function EyR(T, {
  metadata: R,
  clientInformation: a,
  refreshToken: e,
  resource: t,
  addClientAuthentication: r,
  fetchFn: h
}) {
  let i = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: e
    }),
    c = await YMT(T, {
      metadata: R,
      tokenRequestParams: i,
      clientInformation: a,
      addClientAuthentication: r,
      resource: t,
      fetchFn: h
    });
  return {
    refresh_token: e,
    ...c
  };
}
async function CyR(T, R, {
  metadata: a,
  resource: e,
  authorizationCode: t,
  fetchFn: r
} = {}) {
  let h = T.clientMetadata.scope,
    i;
  if (T.prepareTokenRequest) i = await T.prepareTokenRequest(h);
  if (!i) {
    if (!t) throw Error("Either provider.prepareTokenRequest() or authorizationCode is required");
    if (!T.redirectUrl) throw Error("redirectUrl is required for authorization_code flow");
    let s = await T.codeVerifier();
    i = dyR(t, s, T.redirectUrl);
  }
  let c = await T.clientInformation();
  return YMT(R, {
    metadata: a,
    tokenRequestParams: i,
    clientInformation: c ?? void 0,
    addClientAuthentication: T.addClientAuthentication,
    resource: e,
    fetchFn: r
  });
}
async function LyR(T, {
  metadata: R,
  clientMetadata: a,
  fetchFn: e
}) {
  let t;
  if (R) {
    if (!R.registration_endpoint) throw Error("Incompatible auth server: does not support dynamic client registration");
    t = new URL(R.registration_endpoint);
  } else t = new URL("/register", T);
  let r = await (e ?? fetch)(t, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(a)
  });
  if (!r.ok) throw await XMT(r);
  return KMT.parse(await r.json());
}
class JD {
  constructor(T, R) {
    this._url = T, this._resourceMetadataUrl = void 0, this._scope = void 0, this._eventSourceInit = R?.eventSourceInit, this._requestInit = R?.requestInit, this._authProvider = R?.authProvider, this._fetch = R?.fetch, this._fetchWithInit = WMT(R?.fetch, R?.requestInit);
  }
  async _authThenStart() {
    if (!this._authProvider) throw new _h("No auth provider");
    let T;
    try {
      T = await Q_(this._authProvider, {
        serverUrl: this._url,
        resourceMetadataUrl: this._resourceMetadataUrl,
        scope: this._scope,
        fetchFn: this._fetchWithInit
      });
    } catch (R) {
      throw this.onerror?.(R), R;
    }
    if (T !== "AUTHORIZED") throw new _h();
    return await this._startOrAuth();
  }
  async _commonHeaders() {
    let T = {};
    if (this._authProvider) {
      let a = await this._authProvider.tokens();
      if (a) T.Authorization = `Bearer ${a.access_token}`;
    }
    if (this._protocolVersion) T["mcp-protocol-version"] = this._protocolVersion;
    let R = QD(this._requestInit?.headers);
    return new Headers({
      ...T,
      ...R
    });
  }
  _startOrAuth() {
    let T = this?._eventSourceInit?.fetch ?? this._fetch ?? fetch;
    return new Promise((R, a) => {
      this._eventSource = new Fg(this._url.href, {
        ...this._eventSourceInit,
        fetch: async (e, t) => {
          let r = await this._commonHeaders();
          r.set("Accept", "text/event-stream");
          let h = await T(e, {
            ...t,
            headers: r
          });
          if (h.status === 401 && h.headers.has("www-authenticate")) {
            let {
              resourceMetadataUrl: i,
              scope: c
            } = ZD(h);
            this._resourceMetadataUrl = i, this._scope = c;
          }
          return h;
        }
      }), this._abortController = new AbortController(), this._eventSource.onerror = e => {
        if (e.code === 401 && this._authProvider) {
          this._authThenStart().then(R, a);
          return;
        }
        let t = new QMT(e.code, e.message, e);
        a(t), this.onerror?.(t);
      }, this._eventSource.onopen = () => {}, this._eventSource.addEventListener("endpoint", e => {
        let t = e;
        try {
          if (this._endpoint = new URL(t.data, this._url), this._endpoint.origin !== this._url.origin) throw Error(`Endpoint origin does not match connection origin: ${this._endpoint.origin}`);
        } catch (r) {
          a(r), this.onerror?.(r), this.close();
          return;
        }
        R();
      }), this._eventSource.onmessage = e => {
        let t = e,
          r;
        try {
          r = vP.parse(JSON.parse(t.data));
        } catch (h) {
          this.onerror?.(h);
          return;
        }
        this.onmessage?.(r);
      };
    });
  }
  async start() {
    if (this._eventSource) throw Error("SSEClientTransport already started! If using Client class, note that connect() calls start() automatically.");
    return await this._startOrAuth();
  }
  async finishAuth(T) {
    if (!this._authProvider) throw new _h("No auth provider");
    if ((await Q_(this._authProvider, {
      serverUrl: this._url,
      authorizationCode: T,
      resourceMetadataUrl: this._resourceMetadataUrl,
      scope: this._scope,
      fetchFn: this._fetchWithInit
    })) !== "AUTHORIZED") throw new _h("Failed to authorize");
  }
  async close() {
    this._abortController?.abort(), this._eventSource?.close(), this.onclose?.();
  }
  async send(T) {
    if (!this._endpoint) throw Error("Not connected");
    try {
      let R = await this._commonHeaders();
      R.set("content-type", "application/json");
      let a = {
          ...this._requestInit,
          method: "POST",
          headers: R,
          body: JSON.stringify(T),
          signal: this._abortController?.signal
        },
        e = await (this._fetch ?? fetch)(this._endpoint, a);
      if (!e.ok) {
        let t = await e.text().catch(() => null);
        if (e.status === 401 && this._authProvider) {
          let {
            resourceMetadataUrl: r,
            scope: h
          } = ZD(e);
          if (this._resourceMetadataUrl = r, this._scope = h, (await Q_(this._authProvider, {
            serverUrl: this._url,
            resourceMetadataUrl: this._resourceMetadataUrl,
            scope: this._scope,
            fetchFn: this._fetchWithInit
          })) !== "AUTHORIZED") throw new _h();
          return this.send(T);
        }
        throw Error(`Error POSTing to endpoint (HTTP ${e.status}): ${t}`);
      }
      await e.body?.cancel();
    } catch (R) {
      throw this.onerror?.(R), R;
    }
  }
  setProtocolVersion(T) {
    this._protocolVersion = T;
  }
}
class JMT {
  append(T) {
    this._buffer = this._buffer ? Buffer.concat([this._buffer, T]) : T;
  }
  readMessage() {
    if (!this._buffer) return null;
    let T = this._buffer.indexOf(`
`);
    if (T === -1) return null;
    let R = this._buffer.toString("utf8", 0, T).replace(/\r$/, "");
    return this._buffer = this._buffer.subarray(T + 1), VyR(R);
  }
  clear() {
    this._buffer = void 0;
  }
}
function VyR(T) {
  return vP.parse(JSON.parse(T));
}
function XyR(T) {
  return JSON.stringify(T) + `
`;
}
function ZyR() {
  let T = {};
  for (let R of aDT) {
    let a = dN.env[R];
    if (a === void 0) continue;
    if (a.startsWith("()")) continue;
    T[R] = a;
  }
  return T;
}
class TDT {
  constructor(T) {
    if (this._readBuffer = new JMT(), this._stderrStream = null, this._serverParams = T, T.stderr === "pipe" || T.stderr === "overlapped") this._stderrStream = new QyR();
  }
  async start() {
    if (this._process) throw Error("StdioClientTransport already started! If using Client class, note that connect() calls start() automatically.");
    return new Promise((T, R) => {
      if (this._process = RDT.default(this._serverParams.command, this._serverParams.args ?? [], {
        env: {
          ...ZyR(),
          ...this._serverParams.env
        },
        stdio: ["pipe", "pipe", this._serverParams.stderr ?? "inherit"],
        shell: !1,
        windowsHide: dN.platform === "win32" && JyR(),
        cwd: this._serverParams.cwd
      }), this._process.on("error", a => {
        R(a), this.onerror?.(a);
      }), this._process.on("spawn", () => {
        T();
      }), this._process.on("close", a => {
        this._process = void 0, this.onclose?.();
      }), this._process.stdin?.on("error", a => {
        this.onerror?.(a);
      }), this._process.stdout?.on("data", a => {
        this._readBuffer.append(a), this.processReadBuffer();
      }), this._process.stdout?.on("error", a => {
        this.onerror?.(a);
      }), this._stderrStream && this._process.stderr) this._process.stderr.pipe(this._stderrStream);
    });
  }
  get stderr() {
    if (this._stderrStream) return this._stderrStream;
    return this._process?.stderr ?? null;
  }
  get pid() {
    return this._process?.pid ?? null;
  }
  processReadBuffer() {
    while (!0) try {
      let T = this._readBuffer.readMessage();
      if (T === null) break;
      this.onmessage?.(T);
    } catch (T) {
      this.onerror?.(T);
    }
  }
  async close() {
    if (this._process) {
      let T = this._process;
      this._process = void 0;
      let R = new Promise(a => {
        T.once("close", () => {
          a();
        });
      });
      try {
        T.stdin?.end();
      } catch {}
      if (await Promise.race([R, new Promise(a => setTimeout(a, 2000).unref())]), T.exitCode === null) {
        try {
          T.kill("SIGTERM");
        } catch {}
        await Promise.race([R, new Promise(a => setTimeout(a, 2000).unref())]);
      }
      if (T.exitCode === null) try {
        T.kill("SIGKILL");
      } catch {}
    }
    this._readBuffer.clear();
  }
  send(T) {
    return new Promise(R => {
      if (!this._process?.stdin) throw Error("Not connected");
      let a = XyR(T);
      if (this._process.stdin.write(a)) R();else this._process.stdin.once("drain", R);
    });
  }
}
function JyR() {
  return "type" in dN;
}
class T7 {
  constructor(T, R) {
    this._hasCompletedAuthFlow = !1, this._url = T, this._resourceMetadataUrl = void 0, this._scope = void 0, this._requestInit = R?.requestInit, this._authProvider = R?.authProvider, this._fetch = R?.fetch, this._fetchWithInit = WMT(R?.fetch, R?.requestInit), this._sessionId = R?.sessionId, this._reconnectionOptions = R?.reconnectionOptions ?? tDT;
  }
  async _authThenStart() {
    if (!this._authProvider) throw new _h("No auth provider");
    let T;
    try {
      T = await Q_(this._authProvider, {
        serverUrl: this._url,
        resourceMetadataUrl: this._resourceMetadataUrl,
        scope: this._scope,
        fetchFn: this._fetchWithInit
      });
    } catch (R) {
      throw this.onerror?.(R), R;
    }
    if (T !== "AUTHORIZED") throw new _h();
    return await this._startOrAuthSse({
      resumptionToken: void 0
    });
  }
  async _commonHeaders() {
    let T = {};
    if (this._authProvider) {
      let a = await this._authProvider.tokens();
      if (a) T.Authorization = `Bearer ${a.access_token}`;
    }
    if (this._sessionId) T["mcp-session-id"] = this._sessionId;
    if (this._protocolVersion) T["mcp-protocol-version"] = this._protocolVersion;
    let R = QD(this._requestInit?.headers);
    return new Headers({
      ...T,
      ...R
    });
  }
  async _startOrAuthSse(T) {
    let {
      resumptionToken: R
    } = T;
    try {
      let a = await this._commonHeaders();
      if (a.set("Accept", "text/event-stream"), R) a.set("last-event-id", R);
      let e = await (this._fetch ?? fetch)(this._url, {
        method: "GET",
        headers: a,
        signal: this._abortController?.signal
      });
      if (!e.ok) {
        if (await e.body?.cancel(), e.status === 401 && this._authProvider) return await this._authThenStart();
        if (e.status === 405) return;
        throw new I_(e.status, `Failed to open SSE stream: ${e.statusText}`);
      }
      this._handleSseStream(e.body, T, !0);
    } catch (a) {
      throw this.onerror?.(a), a;
    }
  }
  _getNextReconnectionDelay(T) {
    if (this._serverRetryMs !== void 0) return this._serverRetryMs;
    let R = this._reconnectionOptions.initialReconnectionDelay,
      a = this._reconnectionOptions.reconnectionDelayGrowFactor,
      e = this._reconnectionOptions.maxReconnectionDelay;
    return Math.min(R * Math.pow(a, T), e);
  }
  _scheduleReconnection(T, R = 0) {
    let a = this._reconnectionOptions.maxRetries;
    if (R >= a) {
      this.onerror?.(Error(`Maximum reconnection attempts (${a}) exceeded.`));
      return;
    }
    let e = this._getNextReconnectionDelay(R);
    this._reconnectionTimeout = setTimeout(() => {
      this._startOrAuthSse(T).catch(t => {
        this.onerror?.(Error(`Failed to reconnect SSE stream: ${t instanceof Error ? t.message : String(t)}`)), this._scheduleReconnection(T, R + 1);
      });
    }, e);
  }
  _handleSseStream(T, R, a) {
    if (!T) return;
    let {
        onresumptiontoken: e,
        replayMessageId: t
      } = R,
      r,
      h = !1,
      i = !1;
    (async () => {
      try {
        let c = T.pipeThrough(new TextDecoderStream()).pipeThrough(new eDT({
          onRetry: s => {
            this._serverRetryMs = s;
          }
        })).getReader();
        while (!0) {
          let {
            value: s,
            done: A
          } = await c.read();
          if (A) break;
          if (s.id) r = s.id, h = !0, e?.(s.id);
          if (!s.data) continue;
          if (!s.event || s.event === "message") try {
            let l = vP.parse(JSON.parse(s.data));
            if (zg(l)) {
              if (i = !0, t !== void 0) l.id = t;
            }
            this.onmessage?.(l);
          } catch (l) {
            this.onerror?.(l);
          }
        }
        if ((a || h) && !i && this._abortController && !this._abortController.signal.aborted) this._scheduleReconnection({
          resumptionToken: r,
          onresumptiontoken: e,
          replayMessageId: t
        }, 0);
      } catch (c) {
        if (this.onerror?.(Error(`SSE stream disconnected: ${c}`)), (a || h) && !i && this._abortController && !this._abortController.signal.aborted) try {
          this._scheduleReconnection({
            resumptionToken: r,
            onresumptiontoken: e,
            replayMessageId: t
          }, 0);
        } catch (s) {
          this.onerror?.(Error(`Failed to reconnect: ${s instanceof Error ? s.message : String(s)}`));
        }
      }
    })();
  }
  async start() {
    if (this._abortController) throw Error("StreamableHTTPClientTransport already started! If using Client class, note that connect() calls start() automatically.");
    this._abortController = new AbortController();
  }
  async finishAuth(T) {
    if (!this._authProvider) throw new _h("No auth provider");
    if ((await Q_(this._authProvider, {
      serverUrl: this._url,
      authorizationCode: T,
      resourceMetadataUrl: this._resourceMetadataUrl,
      scope: this._scope,
      fetchFn: this._fetchWithInit
    })) !== "AUTHORIZED") throw new _h("Failed to authorize");
  }
  async close() {
    if (this._reconnectionTimeout) clearTimeout(this._reconnectionTimeout), this._reconnectionTimeout = void 0;
    this._abortController?.abort(), this.onclose?.();
  }
  async send(T, R) {
    try {
      let {
        resumptionToken: a,
        onresumptiontoken: e
      } = R || {};
      if (a) {
        this._startOrAuthSse({
          resumptionToken: a,
          replayMessageId: cG(T) ? T.id : void 0
        }).catch(A => this.onerror?.(A));
        return;
      }
      let t = await this._commonHeaders();
      t.set("content-type", "application/json"), t.set("accept", "application/json, text/event-stream");
      let r = {
          ...this._requestInit,
          method: "POST",
          headers: t,
          body: JSON.stringify(T),
          signal: this._abortController?.signal
        },
        h = await (this._fetch ?? fetch)(this._url, r),
        i = h.headers.get("mcp-session-id");
      if (i) this._sessionId = i;
      if (!h.ok) {
        let A = await h.text().catch(() => null);
        if (h.status === 401 && this._authProvider) {
          if (this._hasCompletedAuthFlow) throw new I_(401, "Server returned 401 after successful authentication");
          let {
            resourceMetadataUrl: l,
            scope: o
          } = ZD(h);
          if (this._resourceMetadataUrl = l, this._scope = o, (await Q_(this._authProvider, {
            serverUrl: this._url,
            resourceMetadataUrl: this._resourceMetadataUrl,
            scope: this._scope,
            fetchFn: this._fetchWithInit
          })) !== "AUTHORIZED") throw new _h();
          return this._hasCompletedAuthFlow = !0, this.send(T);
        }
        if (h.status === 403 && this._authProvider) {
          let {
            resourceMetadataUrl: l,
            scope: o,
            error: n
          } = ZD(h);
          if (n === "insufficient_scope") {
            let p = h.headers.get("WWW-Authenticate");
            if (this._lastUpscopingHeader === p) throw new I_(403, "Server returned 403 after trying upscoping");
            if (o) this._scope = o;
            if (l) this._resourceMetadataUrl = l;
            if (this._lastUpscopingHeader = p ?? void 0, (await Q_(this._authProvider, {
              serverUrl: this._url,
              resourceMetadataUrl: this._resourceMetadataUrl,
              scope: this._scope,
              fetchFn: this._fetch
            })) !== "AUTHORIZED") throw new _h();
            return this.send(T);
          }
        }
        throw new I_(h.status, `Error POSTing to endpoint: ${A}`);
      }
      if (this._hasCompletedAuthFlow = !1, this._lastUpscopingHeader = void 0, h.status === 202) {
        if (await h.body?.cancel(), zmR(T)) this._startOrAuthSse({
          resumptionToken: void 0
        }).catch(A => this.onerror?.(A));
        return;
      }
      let c = (Array.isArray(T) ? T : [T]).filter(A => "method" in A && "id" in A && A.id !== void 0).length > 0,
        s = h.headers.get("content-type");
      if (c) {
        if (s?.includes("text/event-stream")) this._handleSseStream(h.body, {
          onresumptiontoken: e
        }, !1);else if (s?.includes("application/json")) {
          let A = await h.json(),
            l = Array.isArray(A) ? A.map(o => vP.parse(o)) : [vP.parse(A)];
          for (let o of l) this.onmessage?.(o);
        } else throw await h.body?.cancel(), new I_(-1, `Unexpected content type: ${s}`);
      } else await h.body?.cancel();
    } catch (a) {
      throw this.onerror?.(a), a;
    }
  }
  get sessionId() {
    return this._sessionId;
  }
  async terminateSession() {
    if (!this._sessionId) return;
    try {
      let T = await this._commonHeaders(),
        R = {
          ...this._requestInit,
          method: "DELETE",
          headers: T,
          signal: this._abortController?.signal
        },
        a = await (this._fetch ?? fetch)(this._url, R);
      if (await a.body?.cancel(), !a.ok && a.status !== 405) throw new I_(a.status, `Failed to terminate session: ${a.statusText}`);
      this._sessionId = void 0;
    } catch (T) {
      throw this.onerror?.(T), T;
    }
  }
  setProtocolVersion(T) {
    this._protocolVersion = T;
  }
  get protocolVersion() {
    return this._protocolVersion;
  }
  async resumeStream(T, R) {
    await this._startOrAuthSse({
      resumptionToken: T,
      onresumptiontoken: R?.onresumptiontoken
    });
  }
}
function aPR(T) {
  return {
    AGENT: "amp",
    AGENT_THREAD_ID: T?.thread?.id || "",
    AMP_CURRENT_THREAD_ID: T?.thread?.id || ""
  };
}
function ePR(T, R) {
  let a = aPR(R);
  return {
    ...T,
    ...a
  };
}
function hDT(T, R = "always", a) {
  return AR.of(ePR(iDT, a));
}
class sDT {
  recordEvent() {}
}
function tPR(T) {
  U9T = T;
}
function oDT(T) {
  U9T.recordEvent(T);
}
function lDT(T) {
  return T === "StdioClientTransport";
}
function rPR(T) {
  let R = lDT(T.transport) ? "localConnected" : "remoteConnected";
  oDT({
    feature: "mcp.connection",
    action: R,
    metadata: {
      transport: T.transport,
      url: T.url,
      serverName: T.serverName,
      threadId: T.threadId
    }
  });
}
function hPR(T) {
  let R = lDT(T.transport) ? "localToolCalled" : "remoteToolCalled";
  oDT({
    feature: "mcp.toolUsage",
    action: R,
    metadata: {
      transport: T.transport,
      url: T.url,
      toolName: T.toolName,
      serverName: T.serverName,
      threadId: T.threadId
    }
  });
}
function iPR(T, R) {
  if (R) return `stdio://${R}`;
  return `stdio://${T.split(/[/\\]/).pop() || "unknown"}`;
}
function plT(T) {
  if (T instanceof _h || T?.name === "UnauthorizedError" || T instanceof JCT) return !0;
  if (T instanceof Error) {
    let R = T.message.toLowerCase(),
      a = R.includes("http 403") || R.includes("403 forbidden"),
      e = R.includes("forbidden"),
      t = R.includes("insufficient_scope");
    if ((a || e) && !t) return !0;
  }
  return !1;
}
async function _lT(T) {
  let {
      transport: R,
      oauthProvider: a,
      oldClient: e,
      baseUrl: t,
      requestInit: r,
      transportType: h,
      serverName: i
    } = T,
    c = a;
  try {
    J.debug("Waiting for OAuth authorization code");
    let s = await c.getAuthorizationCode();
    J.debug("Got authorization code, calling finishAuth", {
      codeLength: s.length
    });
    try {
      await R.finishAuth(s), J.debug("finishAuth completed - tokens exchanged, provider now has tokens");
    } catch (o) {
      throw await c.cleanupOnFailure(), o;
    }
    await c.releaseLockOnSuccess();
    try {
      await e.close();
    } catch (o) {
      J.debug("Failed to close previous client", {
        error: o
      });
    }
    let A = new wj(Yg.clientInfo, {
        capabilities: Yg.capabilities
      }),
      l = h === "HTTP" ? new T7(t, {
        requestInit: r,
        authProvider: a
      }) : new JD(t, {
        requestInit: r,
        authProvider: a
      });
    return J.debug("Connecting with authenticated transport"), await A.connect(l, {
      timeout: blT
    }), J.debug(`${h} OAuth flow succeeded - client connected`), {
      client: A,
      transportInfo: {
        type: h === "HTTP" ? "StreamableHTTPClientTransport" : "SSEClientTransport",
        url: R7(t)
      }
    };
  } catch (s) {
    if (s instanceof Z0T) {
      if (J.info("Another Amp instance is handling OAuth, waiting for tokens", {
        serverName: i,
        holderPid: s.holderPid
      }), await c.waitForTokensFromOtherInstance()) {
        try {
          await e.close();
        } catch (o) {
          J.debug("Failed to close previous client", {
            error: o
          });
        }
        let A = new wj(Yg.clientInfo, {
            capabilities: Yg.capabilities
          }),
          l = h === "HTTP" ? new T7(t, {
            requestInit: r,
            authProvider: a
          }) : new JD(t, {
            requestInit: r,
            authProvider: a
          });
        return await A.connect(l, {
          timeout: blT
        }), J.debug(`${h} connected using tokens from another instance`), {
          client: A,
          transportInfo: {
            type: h === "HTTP" ? "StreamableHTTPClientTransport" : "SSEClientTransport",
            url: R7(t)
          }
        };
      }
      throw new vG("Timed out waiting for OAuth tokens from another Amp instance. Please try again.", s);
    }
    if (J.error(`${h} OAuth flow failed`, {
      serverName: i,
      baseUrl: t.toString(),
      error: s.message,
      errorName: s.name
    }), s.name === "OAuthTimeoutError") throw s;
    throw new vG(`OAuth authentication failed: ${s.message}

If this server doesn't support OAuth, add authentication headers to your config.
If it does support OAuth, ensure you've registered with:
  amp mcp oauth login <server-name> --server-url <url> --client-id <id> --auth-url <url> --token-url <url>`, s);
  }
}
function ADT(T, R) {
  for (let a of T ?? []) if (r9T(oPR(R), a.matches)) return a.action === "allow";
  return !0;
}
function oPR(T) {
  if ("command" in T) return {
    command: T.command,
    args: T.args?.join(" "),
    env: T.env
  };
  return T;
}
function Uq(T, R, a, e, t, r, h) {
  let i = new wj(Bj.clientInfo, {
      capabilities: Bj.capabilities
    }),
    c = null,
    s = !!t,
    A = !1,
    l = null,
    o = new f0("idle");
  if (h) o.subscribe(w => h(w));
  if (t) t.onAuthStateChange = w => {
    o.next(w);
  };
  let n = new f0(0),
    p = new f0(null),
    _ = new f0(!1);
  function m(w, D) {
    if (A) return;
    if (w >= ky.maxRetries) {
      J.warn("MCP max reconnection attempts reached", {
        serverName: r,
        attempts: w
      }), p.next(null);
      return;
    }
    if (D && _DT.includes(D.code)) {
      J.info("MCP not reconnecting due to permanent error", {
        serverName: r,
        errorCode: D.code
      }), p.next(null);
      return;
    }
    let B = Math.min(ky.initialDelayMs * ky.backoffFactor ** w, ky.maxDelayMs);
    J.info("MCP scheduling reconnection", {
      serverName: r,
      attempt: w + 1,
      maxAttempts: ky.maxRetries,
      delayMs: B
    }), p.next({
      attempt: w + 1,
      nextRetryMs: B
    }), l = setTimeout(() => {
      if (l = null, !A) p.next(null), _.next(!1), n.next(w + 1);
    }, B);
  }
  let b = n.pipe(f0T(w => sET(Q9(async () => {
      if (await i.close(), a !== "enabled" || A) return null;
      let D = await pPR(T, i, R, e, t, r);
      if (SG.set(D.client, D.transportInfo), rPR({
        transport: D.transportInfo.type,
        url: D.transportInfo.url,
        serverName: r
      }), D.client.onclose = () => {
        if (!A) J.warn("MCP client connection closed unexpectedly", {
          serverName: r
        }), m(0);
      }, c = D.client, w > 0) J.info("MCP reconnection successful", {
        serverName: r,
        afterAttempts: w
      });
      return D.client;
    }), k0T).pipe(mE({
      onUnsubscribe: async () => {
        try {
          await (c ?? i).close();
        } catch (D) {
          J.error("Error closing client in lifecycle", {
            error: D
          });
        }
      }
    })), {
      shouldCountRefs: !0
    })),
    y = 0,
    u = b.subscribe(w => {
      if (w instanceof Error) {
        J.error("MCP client connection error in observable", {
          serverName: r,
          error: w.message,
          errorName: w.name,
          stack: w.stack
        });
        let D = mlT(w, r, s);
        m(y, D), y++;
      } else if (w && !(w instanceof Error) && w !== Jo) c = w, y = 0, J.debug("Active client captured for lifecycle management");
    }),
    P = w => mlT(w, r, s),
    k = b.pipe(vs(w => {
      if (w?.name === "AbortError") return J.debug("Caught AbortError in connection observable, treating as connection failed"), AR.of(Error("Connection aborted"));
      return AR.of(w);
    }), JR(w => {
      if (w === null) {
        if (a === "denied") return {
          type: "denied"
        };
        return {
          type: "awaiting-approval"
        };
      }
      if (w === Jo) return {
        type: "connecting"
      };
      if (w instanceof Error) return {
        type: "failed",
        error: P(w)
      };
      return {
        type: "connected",
        capabilities: w.getServerCapabilities(),
        serverInfo: w.getServerVersion()
      };
    })),
    x = v3(o, p, k).pipe(JR(([w, D, B]) => {
      if (w === "authenticating") return {
        type: "authenticating"
      };
      if (D && B.type === "failed") return {
        type: "reconnecting",
        attempt: D.attempt,
        nextRetryMs: D.nextRetryMs
      };
      return B;
    })),
    f = b.pipe(JR(w => {
      if (w && !(w instanceof Error) && w !== Jo) return w;
      return null;
    })),
    v = f.pipe(L9(w => {
      if (!w) return AR.of(null);
      let D = new W0();
      return w.setNotificationHandler(VD, () => {
        D.next();
      }), D.pipe(mE({
        onUnsubscribe: () => w.removeNotificationHandler("notifications/tools/list_changed")
      }), Y3(void 0), JR(() => w));
    })),
    g = f.pipe(L9(w => {
      if (!w) return AR.of(null);
      let D = new W0();
      return w.setNotificationHandler(GD, () => {
        D.next();
      }), D.pipe(mE({
        onUnsubscribe: () => w.removeNotificationHandler("notifications/resources/list_changed")
      }), Y3(void 0), JR(() => w));
    })),
    I = f.pipe(L9(w => {
      if (!w) return AR.of(null);
      let D = new W0();
      return w.setNotificationHandler(KD, () => {
        D.next();
      }), D.pipe(mE({
        onUnsubscribe: () => w.removeNotificationHandler("notifications/prompts/list_changed")
      }), Y3(void 0), JR(() => w));
    })),
    S = [],
    O = v.pipe(L9(w => {
      if (!w) return AR.of(S);
      return Q9(async () => {
        let D = await w.listTools();
        return _.next(!0), S = D.tools, D.tools;
      }).pipe(Y3(S), vs(D => {
        return J.error("Failed to list tools", {
          serverName: r,
          error: D
        }), _.next(!0), AR.of(S);
      }));
    })),
    j = _.pipe(JR(w => w)),
    d = I.pipe(L9(w => {
      if (!w) return AR.of([]);
      return Q9(async () => {
        if (!w.getServerCapabilities()?.prompts) return [];
        return (await w.listPrompts()).prompts;
      }).pipe(Y3([]), vs(D => {
        return J.error("Failed to list prompts", {
          serverName: r,
          error: D
        }), AR.of([]);
      }));
    })),
    C = g.pipe(L9(w => {
      if (!w) return AR.of([]);
      return Q9(async () => {
        if (!w.getServerCapabilities()?.resources) return [];
        return (await w.listResources()).resources;
      }).pipe(Y3([]), vs(D => {
        return J.error("Failed to list resources", {
          serverName: r,
          error: D
        }), AR.of([]);
      }));
    })),
    L = async () => {
      let w = await UnR(b);
      if (!w || w instanceof Error) throw Error("MCP client is not connected");
      return w;
    };
  return {
    status: x,
    tools: O,
    toolsLoaded: j,
    resources: C,
    prompts: d,
    async callTool(w, D, B) {
      let M = await L(),
        V = await M.callTool(w, void 0, {
          signal: B,
          timeout: 999999000
        });
      if (!("content" in V)) throw Error("unexpected response");
      let Q = SG.get(M);
      if (Q) hPR({
        transport: Q.type,
        url: Q.url,
        toolName: w.name,
        serverName: r,
        threadId: D.thread?.id
      });
      let W = bPR(V.content);
      if (V.isError) throw Error(mPR(w.name, W));
      return W;
    },
    async listResources(w, D) {
      let B = await L();
      if (!B.getServerCapabilities()?.resources) return [];
      return (await B.listResources(w, {
        signal: D,
        timeout: 999999000
      })).resources;
    },
    async readResource(w, D) {
      return (await (await L()).readResource(w, {
        signal: D,
        timeout: 999999000
      })).contents;
    },
    async getPrompt(w, D, B) {
      try {
        return await (await L()).getPrompt({
          name: w,
          arguments: D
        }, {
          signal: B,
          timeout: 999999000
        });
      } catch (M) {
        return null;
      }
    },
    async [Symbol.asyncDispose]() {
      if (A = !0, l !== null) clearTimeout(l), l = null;
      p.next(null), u.unsubscribe();
      try {
        await (c ?? i).close();
      } catch (w) {
        J.error("Error closing MCP client", {
          error: w
        });
      }
    }
  };
}
async function nPR(T, R, a, e, t) {
  let r = a ? {
      headers: a
    } : void 0,
    h = new T7(R, t ? {
      requestInit: r,
      authProvider: t
    } : r ? {
      requestInit: r
    } : void 0);
  try {
    await e.connect(h, {
      timeout: jG
    }), J.debug("Connected using StreamableHTTPClientTransport");
    let s = R7(R);
    return {
      client: e,
      transportInfo: {
        type: "StreamableHTTPClientTransport",
        url: s
      }
    };
  } catch (s) {
    if (plT(s) && t) {
      J.debug("OAuth authorization required, starting OAuth flow", {
        serverName: T,
        baseUrl: R.toString()
      });
      try {
        return await _lT({
          transport: h,
          oauthProvider: t,
          oldClient: e,
          baseUrl: R,
          requestInit: r,
          transportType: "HTTP",
          serverName: T
        });
      } catch (A) {
        if (A.name === "OAuthTimeoutError") throw A;
        J.debug("HTTP OAuth flow failed, will try SSE fallback", {
          serverName: T,
          error: A.message
        });
      }
    }
    J.debug("StreamableHTTPClientTransport failed, falling back to SSE", {
      serverName: T,
      baseUrl: R.toString(),
      error: s.message
    });
  }
  try {
    await e.close();
  } catch (s) {
    J.debug("Failed to close previous client", {
      error: s
    });
  }
  let i = new wj(Bj.clientInfo, {
      capabilities: Bj.capabilities
    }),
    c = new JD(R, t ? {
      requestInit: r,
      authProvider: t
    } : r ? {
      requestInit: r
    } : void 0);
  try {
    await i.connect(c, {
      timeout: jG
    }), J.debug("Connected using SSEClientTransport");
    let s = R7(R);
    return {
      client: i,
      transportInfo: {
        type: "SSEClientTransport",
        url: s
      }
    };
  } catch (s) {
    if (plT(s) && t) return J.debug("SSE OAuth authorization required, completing flow", {
      serverName: T,
      baseUrl: R.toString()
    }), await _lT({
      transport: c,
      oauthProvider: t,
      oldClient: i,
      baseUrl: R,
      requestInit: r,
      transportType: "SSE",
      serverName: T
    });
    throw s;
  }
}
function lPR(T) {
  let R = T.command.toLowerCase(),
    a = T.args?.join(" ").toLowerCase() ?? "";
  if (R.includes("mcp-remote") || a.includes("mcp-remote")) return !0;
  if ((R === "npx" || R === "bunx") && a.includes("mcp-remote")) return !0;
  return !1;
}
async function APR(T, R, a, e) {
  let t = a.loadProfile === "never" || !a.workingDirectory || !Pj(a.workingDirectory) ? process.env : await m0(hDT(a.workingDirectory.fsPath, a.loadProfile)),
    r = T.env ? Object.entries(T.env).reduce((o, [n, p]) => ({
      ...o,
      [n]: z$(p, t)
    }), {}) : void 0,
    h = _PR({
      ...t,
      ...r,
      AWS_VAULT_PROMPT: "stdout"
    }),
    i = z$(T.command, h),
    c = T.args ? T.args.map(o => z$(o, h)) : void 0,
    s = lPR(T),
    A = !1;
  if (s && e) {
    let o = await dj(e);
    if (!o.acquired) {
      J.info("Another Amp instance is connecting to OAuth proxy, waiting", {
        serverName: e,
        holderPid: o.holder.pid
      });
      let n = Date.now(),
        p = 300000;
      while (Date.now() - n < p) if (await new Promise(_ => setTimeout(_, a4T)), (await dj(e)).acquired) {
        A = !0, J.info("Acquired lock after waiting, proceeding with connection", {
          serverName: e,
          waitedMs: Date.now() - n
        });
        break;
      }
      if (!A) {
        let _ = gpR(e);
        throw Error(`Timed out waiting for another Amp instance to complete OAuth for ${e}. If this persists, you can manually remove the lock file: ${_}`);
      }
    } else A = !0;
  }
  let l = new TDT({
    command: i,
    args: c,
    stderr: "pipe",
    cwd: a.workingDirectory && Pj(a.workingDirectory) ? a.workingDirectory.fsPath : void 0,
    env: h
  });
  try {
    await R.connect(l, {
      timeout: jG
    });
    let o = iPR(i, e);
    if (A && e) await ED(e);
    return {
      client: R,
      transportInfo: {
        type: "StdioClientTransport",
        url: o
      }
    };
  } catch (o) {
    if (A && e) await ED(e);
    if (o instanceof Error && o.message.includes("Connection closed")) throw Error("MCP server connection was closed unexpectedly.");
    throw o;
  }
}
async function pPR(T, R, a, e, t, r) {
  if (!ADT(e, T)) throw Error("MCP server is not allowed by MCP permissions");
  if ("url" in T) {
    let h = z$(T.url, process.env),
      i = T.headers ? Object.entries(T.headers).reduce((c, [s, A]) => ({
        ...c,
        [s]: z$(A, process.env)
      }), {}) : void 0;
    return nPR(r, new URL(h), i, R, t);
  }
  return APR(T, R, a, r);
}
function z$(T, R) {
  return T.replace(/\$\{([^}]+)\}/g, (a, e) => {
    let t = R[e];
    if (t === void 0) return a;
    return t;
  });
}
function _PR(T) {
  let {
    AMP_API_KEY: R,
    ...a
  } = T;
  return a;
}
function bPR(T) {
  return T.map(R => {
    if (R.type === "text") {
      let a = Mb.bufferByteLengthCompat(R.text);
      if (a > ML) {
        let e = Mb.utf8Clamp(R.text, ML),
          t = Math.round(a / 1024);
        return {
          type: "text",
          text: `${e}

... [Tool result truncated - showing first ${Math.round(ML / 1024)}KB of ${t}KB total. The tool result was too long and has been shortened. Consider using more specific queries or parameters to get focused results.]`
        };
      }
    }
    if (R.type === "image") {
      let a = uPR(R.data);
      if (a) return {
        type: "text",
        text: `[MCP image error: ${a}]`
      };
    }
    return R;
  });
}
function mPR(T, R) {
  let a = R.filter(e => e.type === "text").map(e => e.text.trim()).filter(e => e.length > 0);
  if (a.length > 0) return a.join(`

`);
  return `MCP tool "${T}" returned an error response without details.`;
}
function uPR(T) {
  return XA({
    source: {
      type: "base64",
      data: T
    }
  });
}
function mlT(T, R, a = !1) {
  let e = T.message;
  if (T instanceof l9) switch (T.code) {
    case c9.RequestTimeout:
      return {
        code: "timeout",
        message: e
      };
    case c9.ConnectionClosed:
      return {
        code: "network",
        message: e || "Connection closed unexpectedly"
      };
    case c9.InvalidRequest:
    case c9.InvalidParams:
    case c9.ParseError:
    case c9.MethodNotFound:
    case c9.InternalError:
      return {
        code: "server-error",
        message: e
      };
  }
  if (e.includes("does not support dynamic client registration")) e = `OAuth connection failed: ${e}

Try registering OAuth credentials manually:
  amp mcp oauth login ${R || "<server-name>"} --server-url <url> --client-id <id>

Required: --server-url, --client-id
Optional: --auth-url, --token-url (auto-discovered if not provided), --client-secret, --scopes

If manual registration doesn't work, this server likely doesn't support OAuth.`;
  let t = "server-error";
  if (e.includes("timeout") || e.includes("Timeout")) t = "timeout";else if (e.includes("OAuth") || e.includes("authorization") || e.includes("Unauthorized") || e.includes("401")) t = "auth-failed";else if (e.includes("fetch failed") || e.includes("network") || e.includes("ECONNREFUSED") || e.includes("ECONNRESET") || e.includes("ETIMEDOUT") || e.includes("Not connected") || e.includes("Connection closed")) t = "network";else if (e.includes("spawn") || e.includes("ENOENT") || e.includes("command not found")) t = "spawn-failed";else if (e.includes("not allowed by MCP permissions")) t = "permission-denied";
  if (t === "auth-failed" && a && R && !e.includes("amp mcp oauth logout")) e = `${e}

If this is due to stale OAuth credentials, clear them and retry:
  amp mcp oauth logout ${R}`;
  return {
    code: t,
    message: e,
    stderr: T.stderr
  };
}
function R7(T) {
  let R = new URL(T.toString());
  R.username = "", R.password = "", R.hash = "";
  let a = ["token", "key", "api_key", "apikey", "access_token", "secret", "password", "auth", "authorization", "bearer", "jwt", "session", "sessionid", "sid"];
  for (let e of Array.from(R.searchParams.keys())) {
    let t = e.toLowerCase();
    if (a.some(r => t.includes(r))) {
      let r = R.searchParams.getAll(e);
      R.searchParams.delete(e);
      for (let h = 0; h < r.length; h++) R.searchParams.append(e, "[REDACTED]");
    }
  }
  return R.toString();
}
async function yPR(T) {
  let R = await fetch(T, {
    signal: AbortSignal.timeout(1e4)
  });
  if (!R.ok) throw Error(`MCP registry request failed with status ${R.status}`);
  return (await R.json()).servers.map(a => a.server);
}
async function PPR(T) {
  let R = Date.now(),
    a = OG.get(T);
  if (a && R - a.timestamp < 300000) return a.servers;
  let e = await yPR(T);
  return OG.set(T, {
    servers: e,
    timestamp: R
  }), e;
}
function ulT(T) {
  try {
    let R = new URL(T);
    if (R.hash = "", R.protocol === "http:" && R.port === "80" || R.protocol === "https:" && R.port === "443") R.port = "";
    let a = `${R.protocol}//${R.host}${R.pathname}`;
    if (a.endsWith("/") && R.pathname !== "/") a = a.slice(0, -1);
    return a;
  } catch {
    return T;
  }
}
function kPR(T) {
  let R = T.command.toLowerCase(),
    a = R.split("/").pop() ?? R;
  if (!T.args?.length) return null;
  let e = uDT[a];
  if (e) {
    let r = T.args[0];
    if (r && e[r]) {
      let h = e[r];
      for (let i = 1; i < T.args.length; i++) {
        let c = T.args[i];
        if (c && !c.startsWith("-")) return {
          registryType: h,
          identifier: c
        };
      }
      return null;
    }
  }
  let t = mDT[a];
  if (t) {
    for (let r of T.args) if (r && !r.startsWith("-")) return {
      registryType: t,
      identifier: r
    };
  }
  return null;
}
function xPR(T, R) {
  if ("url" in T) {
    let e = ulT(T.url);
    return R.flatMap(t => t.remotes?.map(r => ulT(r.url)) ?? []).includes(e);
  }
  let a = kPR(T);
  if (a) return R.flatMap(e => e.packages?.map(t => ({
    registryType: t.registryType,
    identifier: t.identifier
  })) ?? []).some(e => e.registryType === a.registryType && e.identifier === a.identifier);
  return !1;
}
async function fPR(T, R) {
  if (!R) return {
    approved: T,
    blocked: {}
  };
  let a = Object.entries(T);
  if (a.length === 0) return {
    approved: {},
    blocked: {}
  };
  let e;
  try {
    e = await PPR(R);
  } catch (h) {
    return {
      approved: {},
      blocked: T,
      error: h instanceof Error ? h : Error(String(h))
    };
  }
  let t = {},
    r = {};
  for (let [h, i] of a) if (xPR(i, e)) t[h] = i;else r[h] = i;
  return {
    approved: t,
    blocked: r
  };
}
async function gPR(T) {
  let R = $PR(T),
    a = JSON.stringify(R);
  if (typeof globalThis.crypto < "u" && globalThis.crypto.subtle) {
    let t = new TextEncoder().encode(a),
      r = await globalThis.crypto.subtle.digest("SHA-256", t);
    return Array.from(new Uint8Array(r)).map(h => h.toString(16).padStart(2, "0")).join("");
  }
  let {
    createHash: e
  } = await import("crypto");
  return e("sha256").update(a).digest("hex");
}
function $PR(T) {
  if ("command" in T) return {
    type: "command",
    command: T.command,
    args: T.args || [],
    env: ylT(T.env || {})
  };
  return {
    type: "url",
    url: T.url,
    headers: ylT(T.headers || {}),
    transport: T.transport || "http"
  };
}
function ylT(T) {
  let R = {};
  for (let a of Object.keys(T).sort()) R[a] = T[a];
  return R;
}
function PlT(T, R) {
  return {
    ...T,
    _ampSkillName: R._ampSkillName,
    _ampSkillNames: R._ampSkillNames,
    _ampSkillIncludeTools: R._ampSkillIncludeTools
  };
}
function yDT(T, R) {
  if (!T || T.length === 0) return [];
  let a = new Set(Object.keys(R ?? {}));
  return T.filter(e => !a.has(e));
}
function Hq(T) {
  if (T.hasNonSkillSource) return !1;
  if (!T.includeTools || T.includeTools.length === 0) return !1;
  return yDT(T.skillNames, T.includeToolsBySkill).length === 0;
}
function vPR(T) {
  let R = yDT(T.skillNames, T.includeToolsBySkill),
    a = T.includeToolsBySkill ? Object.entries(T.includeToolsBySkill).filter(([, t]) => t.some(r => Cj(T.toolName, r))).map(([t]) => t) : [],
    e = Array.from(new Set([...R, ...a]));
  return e.length > 0 ? e : void 0;
}
function jPR({
  configService: T,
  externalMCPServers: R = AR.of({}),
  skillMCPServers: a = AR.of({}),
  createOAuthProvider: e,
  trustStore: t,
  oauthStorage: r
}) {
  let h = new kDT(),
    i = new W0(),
    c,
    s = v3(T.config, R, a, ln(T)).pipe(JR(([{
      settings: {
        mcpServers: g,
        mcpPermissions: I,
        mcpTrustedServers: S,
        "terminal.commands.nodeSpawn.loadProfile": O
      }
    }, j, d, C]) => ({
      mcpServers: g,
      mcpPermissions: I,
      mcpTrustedServers: S,
      mcpRegistryUrl: X9(C) ? C.workspace?.mcpRegistryUrl ?? null : null,
      loadProfile: O,
      externalMCPServers: j,
      skillMCPServers: d
    })), E9((g, I) => XE(g, I))),
    A = T.workspaceRoot.pipe(JR(g => g ?? void 0), E9((g, I) => g?.toString() === I?.toString())),
    l = new Map();
  function o(g) {
    let I = g.spec,
      S = Hq({
        hasNonSkillSource: g.isFromMainConfig,
        skillNames: g.skillNames,
        includeTools: I.includeTools,
        includeToolsBySkill: I._ampSkillIncludeTools
      });
    return {
      name: g.name,
      spec: g.spec,
      isExternal: g.isExternal,
      requiresApproval: !1,
      specHash: void 0,
      skillName: g.skillName,
      skillNames: g.skillNames,
      includeTools: S ? I.includeTools : void 0,
      status: {
        type: "blocked-by-registry",
        registryUrl: g.registryUrl
      },
      tools: [],
      prompts: []
    };
  }
  let n,
    p,
    _ = v3(s, A, i.pipe(Y3(void 0))).pipe(KS(300), L9(([{
      mcpServers: g,
      mcpPermissions: I,
      mcpTrustedServers: S,
      mcpRegistryUrl: O,
      loadProfile: j,
      externalMCPServers: d,
      skillMCPServers: C
    }, L, w]) => Q9(async D => {
      let B = [],
        M = {};
      for (let [W, eT] of Object.entries(C ?? {})) M[W] = eT;
      for (let [W, eT] of Object.entries(g ?? {})) {
        let iT = C?.[W];
        if (iT) M[W] = PlT(eT, iT);else M[W] = eT;
      }
      for (let [W, eT] of Object.entries(d ?? {})) {
        let iT = M[W];
        if (iT?._ampSkillNames) M[W] = PlT(eT, iT);else M[W] = eT;
      }
      let V = M;
      if (O) {
        let W = await fPR(V, O);
        if (D.aborted) return {
          connections: [],
          blocked: []
        };
        if (W.error) return J.error("MCP registry unreachable, blocking all MCP servers (fail-closed)", {
          registryUrl: O,
          error: W.error.message
        }), B = Object.entries(V).map(([eT, iT]) => ({
          name: eT,
          spec: iT,
          registryUrl: O,
          isExternal: eT in d,
          isFromMainConfig: Boolean(g?.[eT]) || Boolean(d?.[eT]),
          skillName: iT._ampSkillName,
          skillNames: iT._ampSkillNames
        })), await Promise.all(Array.from(l.entries()).map(async ([eT, {
          client: iT
        }]) => {
          J.info("Disposing MCP connection due to registry failure", {
            serverName: eT
          }), await iT[Symbol.asyncDispose](), l.delete(eT);
        })), {
          connections: [],
          blocked: B
        };
        B = Object.entries(W.blocked).map(([eT, iT]) => ({
          name: eT,
          spec: iT,
          registryUrl: O,
          isExternal: eT in d,
          isFromMainConfig: Boolean(g?.[eT]) || Boolean(d?.[eT]),
          skillName: iT._ampSkillName,
          skillNames: iT._ampSkillNames
        }));
        for (let [eT] of Object.entries(W.blocked)) {
          J.warn("MCP server blocked by registry", {
            serverName: eT,
            registryUrl: O
          });
          let iT = l.get(eT);
          if (iT) await iT.client[Symbol.asyncDispose](), l.delete(eT);
        }
        V = W.approved;
      } else B = [];
      let Q = h.consume() || !XE(n, I) || !XE(p, S);
      n = I, p = S;
      for (let [W, eT] of Object.entries(V)) {
        let iT = l.get(W);
        if (!Q && iT && XE(iT.spec, eT)) continue;
        let aT = "url" in eT && (!!eT.oauth || !eT.headers && eT.transport !== "http"),
          oT = "url" in eT ? eT.oauth : void 0,
          TT = "url" in eT ? eT.url : void 0,
          tT = aT && e && TT ? await e(W, TT, oT) : void 0,
          lT = eT._target === "workspace",
          N = await gPR(eT),
          q = !1,
          F;
        if (lT) {
          let Z = {
            serverName: W,
            specHash: N
          };
          if (!(await t.isTrusted(Z))) {
            let X = await t.hasEntry?.(Z),
              rT = X ? "denied" : "awaiting-approval";
            if (F = Uq(eT, {
              workingDirectory: L,
              loadProfile: j
            }, rT, I, tT, W), q = rT === "awaiting-approval", J.info(`MCP server ${W} ${rT === "denied" ? "was denied" : "requires approval before execution"}`, {
              specHash: N,
              trustState: rT
            }), !X) c?.(W, eT);
          } else F = Uq(eT, {
            workingDirectory: L,
            loadProfile: j
          }, "enabled", I, tT, W);
        } else F = Uq(eT, {
          workingDirectory: L,
          loadProfile: j
        }, "enabled", I, tT, W);
        let E = Boolean(g?.[W] || d?.[W]),
          U = eT;
        if (l.set(W, {
          spec: eT,
          client: F,
          isExternal: Boolean(d[W]),
          skillName: U._ampSkillName,
          skillNames: U._ampSkillNames,
          isFromMainConfig: E,
          requiresApproval: q,
          specHash: N
        }), iT) await iT.client[Symbol.asyncDispose]();
      }
      for (let [W, {
        client: eT
      }] of l.entries()) if (!V || !(W in V)) await eT[Symbol.asyncDispose](), l.delete(W);
      return {
        connections: Array.from(l.entries()),
        blocked: B
      };
    })), f3({
      shouldCountRefs: !1
    })),
    m = _.subscribe({}),
    b = new Map(),
    y = 30000,
    u = g => {
      if (g) b.delete(g);else b.clear();
    },
    P = _.pipe(L9(({
      connections: g
    }) => g.length === 0 ? AR.of({
      ready: [],
      disabled: []
    }) : v3(...g.map(([I, {
      client: S
    }]) => S.status.pipe(da(O => O.type !== "connecting" && O.type !== "authenticating" && O.type !== "reconnecting"), ti(1), L9(O => {
      if (O.type !== "connected") return AR.of({
        name: I,
        disabled: !0
      });
      return S.toolsLoaded.pipe(da(j => j), ti(1), JR(() => ({
        name: I,
        disabled: !1
      })));
    })))).pipe(JR(I => ({
      ready: I.filter(S => !S.disabled).map(S => S.name),
      disabled: I.filter(S => S.disabled).map(S => S.name)
    })))), ti(1)),
    k = v3(_.pipe(L9(({
      connections: g
    }) => g.length === 0 ? AR.of([]) : v3(...g.map(([I, {
      spec: S,
      client: O,
      skillName: j,
      skillNames: d,
      isFromMainConfig: C
    }]) => O.tools.pipe(JR(L => ({
      name: I,
      spec: S,
      tools: L,
      client: O,
      skillName: j,
      skillNames: d,
      isFromMainConfig: C
    }))))))), T.config.pipe(JR(g => g.settings.mcpPermissions), E9())).pipe(JR(([g, I]) => ({
      mcpServers: g,
      mcpPermissions: I
    }))),
    x = k.pipe(JR(({
      mcpServers: g
    }) => {
      if (g.length === 0) return {
        type: "ready",
        toolCount: 0
      };
      return {
        type: "ready",
        toolCount: g.reduce((I, {
          tools: S
        }) => I + S.length, 0)
      };
    }), f3({
      shouldCountRefs: !1
    })),
    f = m0(P).then(({
      ready: g,
      disabled: I
    }) => {
      J.info("mcpService.initialized", {
        ready: g,
        disabled: I
      });
    }).catch(g => {
      J.warn("MCP service initialization failed, but service will continue", {
        error: g
      });
    }),
    v = v3(T.config, _).pipe(L9(([g, {
      connections: I,
      blocked: S
    }]) => {
      let O = S.map(o);
      if (I.length === 0) return AR.of(O);
      return v3(...I.map(([j, {
        spec: d,
        client: C,
        isExternal: L,
        isFromMainConfig: w,
        requiresApproval: D,
        specHash: B,
        skillName: M,
        skillNames: V
      }]) => v3(C.status, C.tools, C.prompts).pipe(JR(([Q, W, eT]) => {
        let iT = d,
          aT = Hq({
            hasNonSkillSource: w,
            skillNames: V,
            includeTools: iT.includeTools,
            includeToolsBySkill: iT._ampSkillIncludeTools
          }),
          oT = W.filter(TT => {
            if (!aT) return !0;
            let tT = iT.includeTools;
            if (tT && tT.length > 0) return tT.some(lT => Cj(TT.name, lT));
            return !0;
          });
        return {
          name: j,
          spec: d,
          isExternal: L,
          requiresApproval: D,
          specHash: B,
          skillName: M,
          skillNames: V,
          includeTools: aT ? iT.includeTools : void 0,
          status: Q,
          tools: oT.map(TT => ({
            spec: {
              name: TT.name,
              description: TT.description,
              inputSchema: TT.inputSchema,
              source: {
                mcp: j
              }
            },
            ...yy({
              name: TT.name,
              source: {
                mcp: j
              }
            }, g)
          })),
          prompts: eT
        };
      })))).pipe(JR(j => [...j, ...O]));
    }), f3({
      shouldCountRefs: !1
    }));
  return {
    name: "MCP",
    initialized: f,
    status: x,
    registerToolsWithToolService(g) {
      let I = new Map(),
        S = k.subscribe(({
          mcpServers: O,
          mcpPermissions: j
        }) => {
          let d = new Set(),
            C = [];
          for (let {
            name: D,
            spec: B,
            tools: M,
            client: V,
            skillName: Q,
            skillNames: W,
            isFromMainConfig: eT
          } of O) {
            if (!ADT(j, B)) {
              if (M.length > 0) J.error(`Ignoring ${M.length} tools from MCP server ${D} due to MCP permissions`);
              continue;
            }
            let iT = B,
              aT = iT.includeTools,
              oT = iT._ampSkillIncludeTools,
              TT = Hq({
                hasNonSkillSource: eT,
                skillNames: W,
                includeTools: aT,
                includeToolsBySkill: oT
              });
            for (let tT of M) {
              if (TT && aT && aT.length > 0) {
                if (!aT.some(F => Cj(tT.name, F))) continue;
              }
              let lT = vPR({
                  toolName: tT.name,
                  skillNames: W,
                  includeToolsBySkill: oT
                }),
                N = OPR(tT, V, D, B._target, Q, lT, eT),
                q = N.spec.name;
              d.add(q), C.push({
                toolName: q,
                registration: N
              });
            }
          }
          let L = [];
          for (let [D, B] of I) if (!d.has(D)) B.dispose(), I.delete(D), L.push(D);
          let w = [];
          for (let {
            toolName: D,
            registration: B
          } of C) try {
            I.get(D)?.dispose();
            let M = g.registerTool(B);
            I.set(D, M), w.push(D);
          } catch (M) {
            J.warn(`Failed to register MCP tool ${D}:`, M);
          }
          if (L.length > 0) J.debug("MCP tools removed", {
            tools: L
          });
        }, O => {
          J.error("MCP tool registration error", {
            error: O
          });
        });
      return {
        dispose: () => {
          S.unsubscribe();
          for (let O of I.values()) O.dispose();
          I.clear();
        }
      };
    },
    servers: v,
    restartServers() {
      h.replenish(), i.next();
    },
    async allowWorkspace(g) {
      return t.allowWorkspace(g);
    },
    async approveWorkspaceServer(g) {
      let I = l.get(g);
      if (!I) throw Error(`MCP server not found: ${g}`);
      if (I.spec._target !== "workspace") throw Error(`Server ${g} is not a workspace server`);
      await t.setTrust({
        serverName: g,
        specHash: I.specHash
      }, !0), this.restartServers();
    },
    async denyWorkspaceServer(g) {
      let I = l.get(g);
      if (!I) throw Error(`MCP server not found: ${g}`);
      if (I.spec._target !== "workspace") throw Error(`Server ${g} is not a workspace server`);
      await t.setTrust({
        serverName: g,
        specHash: I.specHash
      }, !1);
    },
    isWorkspaceTrusted() {
      return t.isWorkspaceTrusted?.() ?? AR.of(!0);
    },
    getClient(g) {
      return l.get(g)?.client;
    },
    async getToolsForServer(g) {
      return (await m0(v.pipe(ti(1)))).find(I => I.name === g)?.tools;
    },
    async searchResources(g) {
      try {
        let {
            connections: I
          } = await m0(_),
          S = Date.now(),
          O = [];
        for (let [j, {
          client: d
        }] of I) {
          if ((await m0(d.status)).type !== "connected") continue;
          try {
            let C,
              L = b.get(j);
            if (L && S < L.expires) C = L.resources;else C = await d.listResources(), b.set(j, {
              resources: C,
              timestamp: S,
              expires: S + y
            });
            for (let w of C) {
              let D = w.title || w.name;
              if (!g || j.toLowerCase().includes(g.toLowerCase()) || D.toLowerCase().includes(g.toLowerCase()) || w.description?.toLowerCase().includes(g.toLowerCase()) || w.uri.toLowerCase().includes(g.toLowerCase())) O.push({
                resource: w,
                serverName: j
              });
            }
          } catch (C) {
            J.warn(`Failed to list resources from MCP server ${j}`, C), u(j);
          }
        }
        return O.slice(0, 50);
      } catch (I) {
        return J.warn("Failed to search MCP resources", {
          error: I
        }), [];
      }
    },
    async getPrompt(g, I, S, O) {
      let j = l.get(I);
      if (j) try {
        return await j.client.getPrompt(g, S, O);
      } catch (d) {
        return null;
      }
      return null;
    },
    async addServer(g, I) {
      let S = (await T.getLatest()).settings.mcpServers;
      if (S && g in S) throw Error(`MCP server already exists with name ${JSON.stringify(g)}`);
      if ("command" in I && typeof I.command !== "string") throw Error("Command must be a string");
      if ("url" in I) try {
        new URL(I.url);
      } catch (O) {
        throw Error(`Invalid URL: ${I.url}`);
      }
      await T.updateSettings("mcpServers", {
        ...S,
        [g]: I
      }, "global");
    },
    async removeServer(g, I) {
      let S = (await T.getLatest()).settings.mcpServers;
      if (!S || !(g in S)) throw Error(`MCP server does not exist with name ${JSON.stringify(g)}`);
      let O = {
        ...S
      };
      if (delete O[g], await T.updateSettings("mcpServers", O, "global"), I?.cleanupOAuth && r) await r.clearAll(g);
    },
    async updateServer(g, I) {
      let S = (await T.getLatest()).settings.mcpServers;
      if (!S || !(g in S)) throw Error(`MCP server does not exist with name ${JSON.stringify(g)}`);
      await T.updateSettings("mcpServers", {
        ...S,
        [g]: I
      }, "global");
    },
    searchPrompts(g) {
      return this.servers.pipe(JR(I => {
        let S = [];
        for (let O of I) if (O.status.type === "connected" && Array.isArray(O.prompts)) {
          let j = O.prompts.map(d => dPR(d, O.name)).filter(d => {
            if (!g) return !0;
            let C = g.toLowerCase();
            return d.label.toLowerCase().includes(C) || d.detail && d.detail.toLowerCase().includes(C);
          });
          S.push(...j);
        }
        return S.sort((O, j) => O.label.localeCompare(j.label)).slice(0, Math.min(10, dpR));
      }));
    },
    async dispose() {
      m.unsubscribe();
      let g = Array.from(l.values()).map(async ({
        client: I
      }) => {
        try {
          await I[Symbol.asyncDispose]();
        } catch (S) {
          J.error("Error disposing MCP client", {
            error: S
          });
        }
      });
      await Promise.all(g), l.clear();
    },
    hasAuthenticatingClients() {
      for (let [, {
        client: g
      }] of l) {
        let I = !1;
        if (g.status.subscribe(S => {
          I = S.type === "authenticating";
        }).unsubscribe(), I) return !0;
      }
      return !1;
    },
    async waitForAuthentication(g = 300000) {
      let I = [];
      for (let [O, {
        client: j
      }] of l) if ((await m0(j.status.pipe(ti(1)))).type === "authenticating") I.push({
        name: O,
        client: j
      });
      if (I.length === 0) return;
      J.info("Waiting for OAuth authentication to complete", {
        servers: I.map(O => O.name)
      });
      let S = I.map(async ({
        name: O,
        client: j
      }) => {
        try {
          await m0(j.status.pipe(da(d => d.type !== "authenticating"), ti(1))), J.debug("OAuth authentication completed", {
            serverName: O
          });
        } catch (d) {
          J.warn("Error waiting for OAuth authentication", {
            serverName: O,
            error: d
          });
        }
      });
      await Promise.race([Promise.all(S), new Promise(O => {
        setTimeout(() => {
          J.warn("OAuth authentication wait timed out", {
            timeoutMs: g,
            servers: I.map(j => j.name)
          }), O();
        }, g);
      })]);
    },
    get onUntrustedWorkspaceServer() {
      return c;
    },
    set onUntrustedWorkspaceServer(g) {
      c = g;
    },
    trustStore: t
  };
}
function XE(T, R) {
  return JSON.stringify(T) === JSON.stringify(R);
}
function PDT(T, R) {
  let a = klT(T, "server"),
    e = klT(R, "tool"),
    t = `mcp__${a}__${e}`;
  if (t.length >= 64) return e.slice(0, 64);
  return t;
}
function klT(T, R) {
  return T.replace(/[\s-]+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "") || R;
}
function SPR({
  skillName: T,
  skillNames: R,
  hasNonSkillSource: a
}) {
  let e = Array.from(new Set([...(R ?? []), ...(T ? [T] : [])]));
  if (e.length === 0) return;
  return {
    skillNames: e,
    isFromMainConfig: a,
    deferred: !a
  };
}
function OPR(T, R, a, e, t, r, h) {
  let i = PDT(a, T.name),
    c = SPR({
      skillName: t,
      skillNames: r,
      hasNonSkillSource: Boolean(h)
    });
  return {
    spec: {
      name: i,
      description: T.description ?? "",
      inputSchema: T.inputSchema,
      source: {
        mcp: a,
        target: e
      },
      meta: c
    },
    fn: ({
      args: s
    }, A) => Q9(l => R.callTool({
      name: T.name,
      arguments: s ?? void 0
    }, A, l).then(o => {
      return J.debug("MCP tool call succeeded", {
        serverName: a,
        toolName: T.name,
        longName: i
      }), {
        status: "done",
        result: o.map(n => {
          if (n.type === "text" || n.type === "image") return n;
          throw Error(`unsupported content type: ${n.type}`);
        })
      };
    }, o => {
      throw J.error("MCP tool call failed", {
        serverName: a,
        toolName: T.name,
        longName: i,
        error: o instanceof Error ? o.message : String(o),
        errorName: o instanceof Error ? o.name : typeof o,
        stack: o instanceof Error ? o.stack : void 0
      }), o;
    }))
  };
}
class kDT {
  forceRestart = !1;
  consume() {
    let T = this.forceRestart;
    return this.forceRestart = !1, T;
  }
  replenish() {
    this.forceRestart = !0;
  }
}
function dPR(T, R) {
  let a = T.arguments?.map(t => ({
      name: t.name,
      required: t.required ?? !1
    })) || [],
    e = {
      uri: d0(`mcp://${R}/${T.name}`),
      label: `${R}/${T.name}`,
      detail: T.description || `From ${R}`,
      insertText: "",
      filterText: `${T.name} ${T.description || ""}`.toLowerCase()
    };
  return {
    ...e,
    kind: "prompt",
    promptData: {
      ...e,
      arguments: a
    }
  };
}
function fDT() {
  let T = "";
  for (let R = 0; R < 5; R++) T += "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 62)];
  return T;
}
function IDT(T, R) {
  return {
    startActiveSpan: async (a, e, t) => {
      let r = fDT();
      T.startTrace({
        name: a,
        label: e.label,
        id: r,
        parent: R,
        startTime: new Date().toISOString(),
        context: e.context ?? {},
        attributes: e.attributes
      });
      let h = {
        id: r,
        addEvent: i => {
          T.recordTraceEvent(r, {
            message: i,
            timestamp: new Date().toISOString()
          });
        },
        setAttributes: i => {
          T.recordTraceAttributes(r, i);
        }
      };
      try {
        return await t(h, IDT(T, r));
      } finally {
        T.endTrace({
          name: a,
          id: r,
          endTime: new Date().toISOString()
        });
      }
    }
  };
}
function CPR(T) {
  switch (T) {
    case "done":
      return "done";
    case "error":
      return "error";
    case "cancelled":
    case "cancellation-requested":
    case "rejected-by-user":
      return "cancelled";
    case "in-progress":
      return "running";
    case "queued":
    case "blocked-on-user":
      return "pending";
  }
}
function LPR(T) {
  if (T.status === "done") return typeof T.result === "string" ? T.result : JSON.stringify(T.result);
  return;
}
function $DT(T, R, a) {
  let e = T[R];
  if (!e) return Promise.reject(Error(`No handler for plugin request method: ${R}`));
  return e(a);
}
function MPR(T) {
  if (T.role === "user") {
    let a = [];
    for (let e of T.content) if (e.type === "text") a.push({
      type: "text",
      text: e.text
    });else if (e.type === "tool_result") {
      let t = e,
        r = {
          type: "tool_result",
          toolUseID: t.toolUseID,
          output: LPR(t.run),
          status: CPR(t.run.status)
        };
      a.push(r);
    }
    return {
      role: "user",
      id: T.messageId,
      content: a
    };
  }
  if (T.role === "assistant") {
    let a = [];
    for (let e of T.content) if (e.type === "text") a.push({
      type: "text",
      text: e.text
    });else if (e.type === "thinking") a.push({
      type: "thinking",
      thinking: e.thinking
    });else if (e.type === "tool_use") {
      let t = e,
        r = {
          type: "tool_use",
          id: t.id,
          name: t.name,
          input: t.input
        };
      a.push(r);
    }
    return {
      role: "assistant",
      id: T.messageId,
      content: a
    };
  }
  let R = [];
  for (let a of T.content) if (a.type === "text") R.push({
    type: "text",
    text: a.text
  });
  return {
    role: "info",
    id: T.messageId,
    content: R
  };
}
function Wq(T) {
  return T.map(MPR);
}
function ckR(T) {
  return T.split(":").filter(Boolean);
}
function skR(T) {
  if (!dG) throw Error("expandPath requires Node.js environment");
  if (T.startsWith("~/") || T === "~") return glT.join(dG, T.slice(1));
  return glT.resolve(T);
}
function Y9T(T) {
  if (!T) return [];
  return ckR(T).map(R => R.trim()).filter(Boolean).map(skR);
}
function okR(T, R) {
  if (R.length === 0) return AR.of([]);
  return new AR(a => {
    let e = new Ls(),
      t = () => {
        a.next(Array.from(e.keys()).toSorted((i, c) => i.toString().localeCompare(c.toString())));
      },
      r = new AbortController();
    Promise.all(R.map(async i => {
      if (umR(i)) return T.findFiles(i, {
        signal: r.signal
      });
      try {
        return await T.stat(i), [i];
      } catch (c) {
        if (c instanceof ur) return [];
        if (typeof c === "object" && c !== null && "code" in c && c.code === "ELOOP") return J.warn("Infinite symlink loop detected in guidance file", {
          file: i.toString()
        }), [];
        throw c;
      }
    })).then(i => {
      for (let c of i.flat()) e.add(c);
      t();
    }).catch(i => {
      if (!r.signal.aborted) r.abort();
      if (!xr(i)) a.error(i);
    });
    let h = R.map(i => T.watch(i, {
      ignoreChanges: !0
    }).subscribe({
      next: c => {
        if (c.type === "create" || c.type === "change") e.add(c.uri);else if (c.type === "delete") e.delete(c.uri);
        t();
      }
    }));
    return () => {
      r.abort();
      for (let i of h) i.unsubscribe();
    };
  });
}
function XDT(T) {
  let R = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/,
    a = T.match(R);
  if (!a) return {
    frontMatter: null,
    content: T.trim()
  };
  let [, e, t] = a,
    r = null;
  try {
    let h = QDT.default.parse(e?.trim() ?? "");
    if (h && typeof h === "object") r = {
      ...h,
      globs: Array.isArray(h.globs) ? h.globs : h.globs && typeof h.globs === "string" ? [h.globs] : void 0
    };
  } catch (h) {
    return J.error("Invalid YAML front matter in guidance file", {
      error: h
    }), {
      frontMatter: null,
      content: T.trim()
    };
  }
  return {
    frontMatter: r,
    content: (t ?? "").trim()
  };
}
function lkR(T, R, a) {
  if (!T || !T.globs || T.globs.length === 0) return !0;
  a = I8(a);
  let e = R.map(t => I8(t));
  for (let t of T.globs) {
    let r = t;
    if (t.startsWith("./") || t.startsWith("../")) r = xD(MR.dirname(a).path, t);else if (!t.startsWith("/") && !t.startsWith("**/")) r = `**/${t}`;
    let h = YDT.default(r, {
      dot: !0
    });
    for (let i of e) if (h(Kt(i))) return !0;
  }
  return !1;
}
async function AkR(T, R, a, e, t) {
  let r = [];
  a = _kR(a);
  let h = /@([a-zA-Z0-9._~/*?[\]{}\\,-]+)/g,
    i;
  while ((i = h.exec(a)) !== null) {
    let c = i[1];
    if (!c) continue;
    c = c.replace(/[.,;!?)]+$/, ""), c = c.replace(/\\(\*)/g, "$1");
    let s = pkR(c, R);
    if (s) {
      J.warn("Ignoring glob pattern:", s);
      continue;
    }
    try {
      let A = await bkR(T, R, c, e, t);
      r.push(...A);
    } catch (A) {}
  }
  return r;
}
function pkR(T, R) {
  let a = R.fsPath;
  if (T.startsWith("**/") || ["*", "**", "/*", "/**", "", "/"].includes(T) || T.includes("__dangerous_glob_canary__")) return `Ignoring glob pattern "${T}" in ${a}, because it may cause performance issues.`;
  return null;
}
function _kR(T) {
  let R = T.replace(/```[\s\S]*?```/g, "");
  return R = R.replace(/`[^`]*`/g, ""), R = R.replace(/<code[^>]*>[\s\S]*?<\/code>/gi, ""), R;
}
async function bkR(T, R, a, e, t) {
  let r, h;
  if (a.startsWith("~/")) {
    if (e.homeDir === null) return [];
    let i = a.slice(2),
      {
        basePart: c,
        patternPart: s
      } = qq(i);
    r = c ? MR.joinPath(e.homeDir, c) : I8(e.homeDir), h = s;
  } else if (a.startsWith("/")) {
    let i = a.slice(1),
      {
        basePart: c,
        patternPart: s
      } = qq(i);
    r = c ? MR.joinPath(zR.file("/"), c) : zR.file("/"), h = s;
  } else {
    let i = MR.dirname(R),
      {
        basePart: c,
        patternPart: s
      } = qq(a);
    r = c ? MR.joinPath(i, c) : i, h = s;
  }
  if (JDT(h)) try {
    let i = await T.findFiles({
      base: r,
      pattern: h
    }, {
      signal: t,
      maxResults: 1000
    });
    if (i.length >= 1000) J.warn("Truncating very large glob expansion result", `Limit (1000) exceeded for '${a}' in ${R.fsPath}.`);
    return i;
  } catch (i) {
    return [];
  }
  if (!h) return [];
  return [MR.joinPath(r, h)];
}
function JDT(T) {
  return T.includes("*") || T.includes("?") || T.includes("[") || T.includes("{");
}
function qq(T) {
  let R = T.split("/"),
    a = [],
    e = [],
    t = !1;
  for (let r of R) if (t || JDT(r)) t = !0, e.push(r);else a.push(r);
  if (!t) {
    if (a.length === 0) return {
      basePart: null,
      patternPart: ""
    };
    let r = a.pop();
    return {
      basePart: a.length === 0 ? null : a.join("/"),
      patternPart: r
    };
  }
  return {
    basePart: a.length === 0 ? null : a.join("/"),
    patternPart: e.join("/")
  };
}
async function ukR({
  filesystem: T
}, R, a, e = [], t) {
  let r = [],
    h = new Ls(),
    i = new Ls(),
    c = new xh(),
    s = [];
  async function A(_, m = !1) {
    let b = I8(_.uri);
    if (h.has(b)) return null;
    if (i.has(b)) return null;
    i.add(b);
    try {
      let y = await T.readFile(b, {
          signal: t
        }),
        {
          frontMatter: u,
          content: P
        } = XDT(y),
        k = lkR(u, e, b),
        x = {
          ..._,
          type: m ? _.type : "mentioned",
          content: P,
          frontMatter: u,
          exclude: !k,
          "~debug": {
            mentionedBy: c.has(b) ? [c.get(b)] : void 0
          }
        };
      h.add(b), r.push(x);
      let f = await AkR(T, b, y, a, t);
      for (let v of f) {
        if (!c.has(v)) c.set(v, _.uri);
        let g = {
            uri: d0(v),
            type: "mentioned"
          },
          I = await A(g, !1);
        if (I) s.push({
          file: I,
          afterFile: _.uri
        });
      }
      return x;
    } catch (y) {
      if (y instanceof Error && y.message.includes("EISDIR")) return J.debug("Guidance file is a directory, skipping", {
        uri: _.uri
      }), null;
      if (Er(y)) J.debug("Guidance file not found (expected)", {
        uri: _.uri
      });else J.error("Error resolving guidance file", {
        uri: _.uri,
        error: y
      });
      return null;
    } finally {
      i.delete(b);
    }
  }
  for (let _ of R7T(R)) await A(_, !0);
  let l = [],
    o = new Set();
  function n(_) {
    if (o.has(_.uri)) return;
    l.push(_), o.add(_.uri);
    let m = s.filter(b => b.afterFile === _.uri);
    for (let b of m) n(b.file);
  }
  let p = r.filter(_ => _.type !== "mentioned");
  for (let _ of p) n(_);
  return l;
}
function PkR(T) {
  return {
    homeDir: T.userConfigDir ? d0(T.userConfigDir) : null
  };
}
function Q9T(T) {
  if (T.path === "/" || T.path === "") return !0;
  let R = T.fsPath;
  if (R === "/" || R === "/Users" || R === "/home" || /^[A-Z]:[\\/?]?$/.test(R)) return !0;
  if (["/proc", "/sys", "/dev"].includes(R)) return !0;
  return !1;
}
function kkR({
  filesystem: T,
  configService: R
}, a) {
  return v3(eET(T), a ? a : AR.of(null), R.workspaceRoot).pipe(L9(([e, t, r]) => {
    let h = r ? [r] : t?.env?.initial?.trees?.map(s => s.uri).filter(s => s !== void 0).map(s => I8(s)) ?? [],
      i = [];
    i.push(...h);
    for (let s of h) {
      let A = MR.dirname(s);
      while (A) {
        if (Q9T(A)) break;
        i.push(A);
        let l = MR.dirname(A);
        if (MR.equalURIs(l, A)) break;
        A = l;
      }
    }
    if (R.userConfigDir) i.push(MR.joinPath(R.userConfigDir, "amp")), i.push(R.userConfigDir);
    let c = i.flatMap(s => SP.map(A => MR.joinPath(s, A)));
    return okR(e, c).pipe(JR(s => {
      let A = [],
        l = new Set();
      for (let o of s) {
        let n = MR.dirname(o).toString(),
          p = MR.basename(o);
        if (l.has(n)) continue;
        let _ = SP.findIndex(y => y === p);
        if (_ === -1) continue;
        let m = !1,
          b = MR.dirname(o);
        for (let y = 0; y < _; y++) {
          let u = SP[y];
          if (s.some(P => {
            let k = MR.equalURIs(MR.dirname(P), b),
              x = MR.basename(P) === u;
            return k && x;
          })) {
            m = !0;
            break;
          }
        }
        if (m) continue;
        if (l.add(n), h.some(y => MR.hasPrefix(o, y))) {
          A.push({
            uri: d0(o),
            type: "project"
          });
          continue;
        }
        if (R.userConfigDir && MR.hasPrefix(o, R.userConfigDir)) {
          A.push({
            uri: d0(o),
            type: "user"
          });
          continue;
        }
        A.push({
          uri: d0(o),
          type: "parent"
        });
      }
      return A;
    }));
  }));
}
function xkR({
  filesystem: T,
  configService: R
}, a) {
  function e(t) {
    let r = new Set(),
      h = [];
    for (let i of t) {
      let c = MR.dirname(i).toString();
      if (!r.has(c)) r.add(c), h.push(c);
    }
    return h.join(",");
  }
  return v3(a.pipe(JR(t => ({
    thread: t,
    readFiles: T7T(t)
  })), E9((t, r) => e(t.readFiles) === e(r.readFiles))), eET(T), R.workspaceRoot).pipe(I2(async ([{
    readFiles: t
  }, r, h], i) => {
    let c = h ? [h] : [],
      s = new Ls();
    for (let A of t) {
      let l = MR.dirname(A);
      while (!s.has(l) && c.some(o => MR.hasPrefix(l, o) && !MR.equalURIs(o, l))) s.add(l), l = MR.dirname(l);
    }
    return (await Promise.all(Array.from(s.keys()).map(async A => {
      for (let l of SP) try {
        let o = MR.joinPath(A, l);
        return await r.stat(o, {
          signal: i
        }), {
          uri: d0(o),
          type: "subtree"
        };
      } catch (o) {
        if (typeof o === "object" && o !== null && "code" in o && o.code === "ELOOP") J.warn("Infinite symlink loop detected in guidance file", {
          file: MR.joinPath(A, l).toString()
        });
      }
      return null;
    }))).filter(A => A !== null);
  }));
}
function T7T(T, R = [y8, mET]) {
  let a = [];
  for (let e of T.messages) if (e.role === "assistant") {
    for (let t of e.content) if (t.type === "tool_use" && R.includes(t.name)) {
      if (t.name === "Read" || t.name === "read_file") {
        let r = cN(T, t.id);
        if (r && r.run.status === "done") {
          let h = r.run.result;
          if (typeof h === "object" && h.absolutePath) a.push(zR.file(h.absolutePath));
        }
      } else if (t.input && typeof t.input === "object" && "path" in t.input && typeof t.input.path === "string") a.push(zR.file(t.input.path));
    }
  }
  for (let e of T.messages) if (e.role === "user" && e.fileMentions) for (let t of e.fileMentions.files) a.push(t.uri);
  return a;
}
function fkR(T) {
  let R = new Set();
  for (let a of T.messages) if (a.role === "assistant") {
    for (let e of a.content) if (e.type === "tool_use") {
      let t = e.name === y8 || e.name === mET,
        r = e.name === Wt;
      if (t || r) {
        let h = cN(T, e.id);
        if (h && h.run.status === "done") {
          let i = h.run.result;
          if (typeof i === "object" && i !== null && "discoveredGuidanceFiles" in i && Array.isArray(i.discoveredGuidanceFiles) && i.discoveredGuidanceFiles.length > 0) for (let c of i.discoveredGuidanceFiles) R.add(c.uri);
        }
      }
    }
  } else if (a.role === "user" && a.discoveredGuidanceFiles) for (let e of a.discoveredGuidanceFiles) R.add(e.uri);
  return R;
}
async function _O(T, R, a) {
  let [e, t] = await Promise.all([m0(kkR(T, AR.of({
    env: R.env
  })), a), m0(xkR(T, AR.of(R)), a)]);
  return a?.throwIfAborted(), (await ukR({
    filesystem: aET(T.filesystem) ? await m0(T.filesystem) : T.filesystem
  }, R7T([...e, ...t]), PkR(T.configService), T7T(R), a)).filter(r => !r.exclude);
}
function R7T(T) {
  return T.toSorted((R, a) => {
    let e = EG[R.type] - EG[a.type];
    if (e !== 0) return e;
    return R.uri.localeCompare(a.uri);
  });
}
function ZA(T, R = 1) {
  let a = zR.parse(T),
    e = MR.basename(a) || "AGENTS.md",
    t = [],
    r = MR.dirname(a);
  for (let h = 0; h < R; h++) {
    let i = MR.basename(r);
    if (!i || i === r.path) break;
    t.unshift(i);
    let c = MR.dirname(r);
    if (MR.equalURIs(c, r)) break;
    r = c;
  }
  if (t.length === 0) return e;
  return [...t, e].join("/");
}
function a7T(T) {
  let R = T.toLowerCase();
  if (R.includes("/.config/") || R.includes("\\.config\\")) return "user's private global instructions for all projects";
  if (R.includes(".local.md") || R.includes("agents.local.md")) return "user's private project instructions, not checked in";
  return "project instructions";
}
function Z9T(T, R = "default") {
  let a = T.filter(e => e.content);
  if (a.length === 0) return "";
  if (R === "deep") return IkR(a);
  return a.map(e => {
    let t = ZA(e.uri),
      r = a7T(e.uri);
    return `${`Contents of ${t} (${r}):`}

<instructions>
${e.content}
</instructions>`;
  }).join(`

`);
}
function IkR(T) {
  return T.map(R => {
    let a = zR.parse(R.uri);
    return `# AGENTS.md instructions for ${MR.dirname(a).fsPath}

<INSTRUCTIONS>
${R.content}
</INSTRUCTIONS>`;
  }).join(`

`);
}
async function fm(T, R, a, e, t, r) {
  let h = e ? fkR(e) : new Set();
  if (t) for (let s of t) h.add(s);
  let i = [],
    c = MR.dirname(R);
  while (a && MR.hasPrefix(c, a) && !MR.equalURIs(a, c)) {
    r?.throwIfAborted();
    for (let A of SP) {
      let l = MR.joinPath(c, A),
        o = d0(l);
      if (h.has(o) || t?.has(o)) break;
      try {
        await T.stat(l, {
          signal: r
        });
        let n = await T.readFile(l, {
            signal: r
          }),
          p = n.split(`
`).length;
        if (!t?.has(o)) {
          t?.add(o), h.add(o);
          let _ = {
            uri: o,
            lineCount: p,
            content: n
          };
          i.push(_);
        }
        break;
      } catch {}
    }
    let s = MR.dirname(c);
    if (MR.equalURIs(s, c)) break;
    c = s;
  }
  return i;
}
function DkR(T) {
  return [t7T, i7T, c7T, h7T, r7T];
}
function wkR(T) {
  if (!T) throw new _b("Invalid skill name", "Skill name is required");
  if (T.length > Db) throw new _b("Invalid skill name", `Frontmatter name "${T}" must be ${Db} characters or less`);
  if (!Nj.test(T)) throw new _b("Invalid skill name", `Frontmatter name "${T}" is invalid. Skill name must be lowercase alphanumeric with hyphens, no trailing hyphen (e.g., "my-skill")`);
}
function n7T(T) {
  let R = T.replace(/^\uFEFF/, "").match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n([\s\S]*))?$/);
  if (!R || !R[1]) throw new _b("Missing YAML frontmatter", `Add frontmatter at the top of SKILL.md:
---
name: my-skill
description: Your skill description
---`);
  let a = l7T.default.parse(R[1]);
  if (!a.name || !a.description) throw new _b("Missing required fields in frontmatter", 'Add both "name" and "description" fields to the frontmatter');
  return wkR(a.name), {
    frontmatter: a,
    body: R[2] ?? ""
  };
}
function A7T(T, R) {
  let a = [];
  if (T.name) {
    if (T.name.length > Db) a.push({
      field: "name",
      message: `Name exceeds ${Db} characters`
    });
    if (!Nj.test(T.name)) a.push({
      field: "name",
      message: "Name must be lowercase a-z, 0-9, hyphens only, must not start/end with hyphen or contain consecutive hyphens"
    });
    if (R && T.name !== R) a.push({
      field: "name",
      message: `Name "${T.name}" does not match parent directory name "${R}"`
    });
  }
  if (T.description && T.description.length > flT) a.push({
    field: "description",
    message: `Description exceeds ${flT} characters`
  });
  if (T.compatibility && T.compatibility.length > IlT) a.push({
    field: "compatibility",
    message: `Compatibility exceeds ${IlT} characters`
  });
  let e = Object.keys(T);
  for (let t of e) if (!x7T.has(t)) a.push({
    field: t,
    message: `Unknown frontmatter field "${t}"`
  });
  return a;
}
function UkR(T) {
  let R = T instanceof Error ? T.message : String(T),
    a = R.match(/at line (\d+)/),
    e = a ? ` on line ${a[1]}` : "";
  if (R.includes("Nested mappings are not allowed in compact mappings")) return {
    message: `Invalid YAML${e}: value contains unquoted colon`,
    hint: 'Wrap the value in quotes: description: "NOT for: code comments"'
  };
  if (R.includes("Implicit map keys need to be followed by map values")) return {
    message: `Invalid YAML${e}: unexpected line break in value`,
    hint: "Use quotes for multi-line values or use YAML block syntax (| or >)"
  };
  if (R.includes("Map keys must be unique")) return {
    message: `Invalid YAML${e}: duplicate field`,
    hint: "Each field (name, description, etc.) can only appear once in frontmatter"
  };
  if (R.includes('Missing closing "quote') || R.includes("Missing closing 'quote")) return {
    message: `Invalid YAML${e}: unclosed quote`,
    hint: "Make sure all quoted strings have matching opening and closing quotes"
  };
  return {
    message: `Invalid YAML in frontmatter${e}`,
    hint: "Check for proper indentation and quote values containing special characters (: @ # etc.)"
  };
}
function p7T(T, R) {
  let a = R instanceof Error ? R.message : String(R),
    e = d0(T);
  if (R instanceof _b) return {
    path: e,
    error: R.message,
    hint: R.hint
  };
  if (a.includes("YAMLParseError") || a.includes("YAML") || a.includes("Nested mappings are not allowed") || a.includes("Implicit map keys") || a.includes("at line") || R?.constructor?.name === "YAMLParseError") {
    let {
      message: t,
      hint: r
    } = UkR(R);
    return {
      path: e,
      error: t,
      hint: r
    };
  }
  return {
    path: e,
    error: a
  };
}
function HkR(T) {
  let R = JSON.parse(T);
  if (R["amp.mcpServers"] && typeof R["amp.mcpServers"] === "object") return R["amp.mcpServers"];
  let a = {};
  for (let [e, t] of Object.entries(R)) if (t && typeof t === "object") {
    let r = t;
    if ("command" in r || "url" in r) a[e] = t;
  }
  return a;
}
async function _7T(T, R, a) {
  try {
    let e = MR.joinPath(R, FkR),
      t = await T.readFile(e, {
        signal: a
      }),
      r = HkR(t);
    if (Object.keys(r).length > 0) return J.debug("Loaded MCP servers from skill", {
      skillDir: d0(R),
      serverCount: Object.keys(r).length,
      serverNames: Object.keys(r)
    }), r;
  } catch {}
  return;
}
async function b7T(T, R) {
  if (R.scheme === "file") try {
    let a = await T.realpath(R);
    return d0(a);
  } catch {}
  return d0(R);
}
async function m7T(T, R, a) {
  if (R.isDirectory) return !0;
  try {
    return (await T.stat(R.uri, {
      signal: a
    })).isDirectory;
  } catch {
    return !1;
  }
}
async function u7T(T, R, a) {
  let e = [],
    t = 5,
    r = new Set(["skill.md", "mcp.json"]),
    h = new Set(["node_modules", ".git", "__pycache__"]);
  async function i(c, s) {
    if (s > 5) return;
    try {
      let A = await T.readdir(c, {
        signal: a
      });
      for (let l of A) {
        let o = MR.basename(l.uri);
        if (await m7T(T, l, a)) {
          if (!h.has(o)) await i(l.uri, s + 1);
        } else if (!r.has(o.toLowerCase())) e.push(l.uri.fsPath);
      }
    } catch {}
  }
  return await i(R, 0), e.sort();
}
async function y7T(T, R, a) {
  let e = [],
    t = 5;
  async function r(h, i) {
    if (i > 5) return;
    try {
      let c = await T.readdir(h, {
        signal: a
      });
      for (let s of c) {
        let A = MR.basename(s.uri),
          l = await m7T(T, s, a);
        if (l && (A === "node_modules" || A === ".git")) continue;
        if (l) await r(s.uri, i + 1);else if (f7T.test(A)) e.push(s.uri);
      }
    } catch (c) {
      J.debug("Failed to scan skill directory", {
        path: h.toString(),
        error: c
      });
    }
  }
  return await r(R, 0), e;
}
async function $lT(T, R, a, e = "skill") {
  let t = {
    skills: [],
    errors: []
  };
  try {
    await T.stat(R, {
      signal: a
    });
    let r = await y7T(T, R, a);
    for (let h of r) {
      let i = MR.dirname(h),
        c = await b7T(T, i);
      try {
        let s = await T.readFile(h, {
            signal: a
          }),
          {
            frontmatter: A,
            body: l
          } = n7T(s),
          o = MR.basename(i),
          n = A7T(A, o);
        if (n.length > 0) for (let m of n) J.warn(`Skill "${A.name}" frontmatter warning`, {
          field: m.field,
          message: m.message,
          path: d0(h)
        });
        if (A.isolatedContext) continue;
        let p = await _7T(T, i, a),
          _ = await u7T(T, i, a);
        t.skills.push({
          path: c,
          skill: {
            name: A.name,
            description: A.description,
            frontmatter: A,
            content: l,
            baseDir: d0(i),
            mcpServers: p,
            builtinTools: A["builtin-tools"],
            files: _.length > 0 ? _ : void 0
          }
        });
      } catch (s) {
        J.warn(`Failed to load ${e}`, {
          path: d0(h),
          error: s
        }), t.errors.push(p7T(h, s));
      }
    }
  } catch (r) {
    if (!Er(r)) J.debug(`Failed to process ${e} directory`, {
      path: R.toString(),
      error: r
    });
  }
  return t;
}
function vlT(T, R, a, e, t, r) {
  for (let {
    path: h,
    skill: i
  } of T.skills) {
    if (R.has(h)) continue;
    if (a.get(i.name)) {
      J.debug("Skipping duplicate skill", {
        name: i.name,
        path: h
      });
      continue;
    }
    R.add(h), a.set(i.name, h), e.push(i);
  }
  t.push(...T.errors);
}
async function Eu(T, R, a, e, t, r, h, i, c = "skill") {
  try {
    await T.stat(R, {
      signal: i
    });
    let s = await y7T(T, R, i);
    for (let A of s) {
      let l = MR.dirname(A),
        o = await b7T(T, l);
      if (!a.has(o)) {
        a.add(o);
        try {
          let n = await T.readFile(A, {
              signal: i
            }),
            {
              frontmatter: p,
              body: _
            } = n7T(n),
            m = MR.basename(l),
            b = A7T(p, m);
          if (b.length > 0) for (let P of b) J.warn(`Skill "${p.name}" frontmatter warning`, {
            field: P.field,
            message: P.message,
            path: d0(A)
          });
          if (p.isolatedContext) continue;
          if (e.get(p.name)) {
            J.debug("Skipping duplicate skill", {
              name: p.name,
              path: d0(A)
            });
            continue;
          }
          e.set(p.name, o);
          let y = await _7T(T, l, i),
            u = await u7T(T, l, i);
          t.push({
            name: p.name,
            description: p.description,
            frontmatter: p,
            content: _,
            baseDir: d0(l),
            mcpServers: y,
            builtinTools: p["builtin-tools"],
            files: u.length > 0 ? u : void 0
          });
        } catch (n) {
          J.warn(`Failed to load ${c}`, {
            path: d0(A),
            error: n
          }), r.push(p7T(A, n));
        }
      }
    }
  } catch (s) {
    if (!Er(s)) J.debug(`Failed to process ${c} directory`, {
      path: R.toString(),
      error: s
    });
  }
}
function WkR(T) {
  return Y9T(T);
}
async function P7T(T, R, a, e) {
  let t = [],
    r = [],
    h = [],
    i = new Set(),
    c = new Map(),
    s = typeof process < "u" ? NkR.homedir() : null,
    A = new Set();
  for (let b of R) {
    let y = Ht(b);
    A.add(d0(y));
    while (y) {
      if (Q9T(y)) break;
      A.add(d0(y));
      let u = MR.dirname(y);
      if (MR.equalURIs(u, y)) break;
      y = u;
    }
  }
  if (J.info("Scanning for skills", {
    searchRoots: [...A],
    workspaceRoots: R
  }), s) {
    let b = MR.joinPath(zR.file(s), ".config", "agents", "skills");
    await Eu(T, b, i, c, t, r, h, a, "global agent skill");
  }
  if (s) {
    let b = MR.joinPath(zR.file(s), ".config", "amp", "skills");
    await Eu(T, b, i, c, t, r, h, a, "global amp skill");
  }
  for (let b of A) {
    let y = Ht(b),
      u = MR.joinPath(y, ".agents", "skills");
    await Eu(T, u, i, c, t, r, h, a, "local .agents skill");
  }
  if (!e?.["skills.disableClaudeCodeSkills"]) for (let b of A) {
    let y = Ht(b),
      u = MR.joinPath(y, ".claude", "skills");
    await Eu(T, u, i, c, t, r, h, a, "local .claude skill");
  }
  if (!e?.["skills.disableClaudeCodeSkills"] && s) {
    let b = MR.joinPath(zR.file(s), ".claude", "skills");
    await Eu(T, b, i, c, t, r, h, a, "global .claude skill");
  }
  if (!e?.["skills.disableClaudeCodeSkills"] && s) {
    let b = MR.joinPath(zR.file(s), ".claude", "plugins", "cache");
    await Eu(T, b, i, c, t, r, h, a, "plugin skill");
  }
  let l = typeof process < "u" && process.env.AMP_TOOLBOX ? process.env.AMP_TOOLBOX : void 0,
    o = s ? `${s}/.config/amp/tools` : null,
    n = l ? Y9T(l) : o ? [o] : [],
    p = await Promise.all(n.map(b => $lT(T, zR.file(b), a, "toolbox skill")));
  for (let b of p) vlT(b, i, c, t, r, h);
  let _ = WkR(e?.["skills.path"]),
    m = await Promise.all(_.map(b => $lT(T, zR.file(b), a, "custom skills.path skill")));
  for (let b of m) vlT(b, i, c, t, r, h);
  for (let b of DkR(e)) {
    let y = c.get(b.name);
    if (y) h.push({
      path: b.baseDir,
      error: `Skill "${b.name}" is masked by ${Mr(y)}`
    });else c.set(b.name, b.baseDir), t.push(b);
  }
  return J.info("Finished loading skills", {
    totalSkills: t.length,
    skillNames: t.map(b => b.name),
    skillBaseDirs: t.map(b => b.baseDir),
    errorCount: r.length,
    warningCount: h.length
  }), {
    skills: t,
    errors: r,
    warnings: h
  };
}
function k7T(T) {
  if (T.length === 0) return null;
  let R = T.filter(a => !a.frontmatter["disable-model-invocation"]).map(a => {
    let e = a.frontmatter["argument-hint"] ? ` ${a.frontmatter["argument-hint"]}` : "";
    return `- **${a.name}**${e}: ${a.description}`;
  }).join(`
`);
  if (!R) return null;
  return R;
}
function qkR(T) {
  let R = T.filter(e => !e.frontmatter["disable-model-invocation"]);
  if (R.length === 0) return null;
  let a = R.map(e => {
    return ["  <skill>", `    <name>${e.name}</name>`, `    <description>${e.description}</description>`, `    <location>${e.baseDir}/SKILL.md</location>`, "  </skill>"].join(`
`);
  }).join(`
`);
  return ["## Skills", "In your workspace you have skills the user created. A **skill** is a guide for proven techniques, patterns, or tools. If a skill exists for a task, you must do it. The following skills provide specialized instructions for specific tasks.", `Use the ${oc} tool to load a skill when the task matches its description.`, "", 'Loaded skills appear as `<loaded_skill name="...">` in the conversation.', "", "<available_skills>", a, "</available_skills>"].join(`
`);
}
function zkR(T) {
  let R = T.filter(a => !a.frontmatter["disable-model-invocation"]);
  if (R.length === 0) return null;
  return ["## Skills", "In your workspace you have skills the user created. A **skill** is a guide for proven techniques, patterns, or tools. If a skill exists for a task, you must do it. The following skills provide specialized instructions for specific tasks..", "### Available skills", R.map(a => `- ${a.name}: ${a.description} (file: ${a.baseDir}/SKILL.md)`).join(`
`), "### How to use skills", `- Discovery: The list above is the skills available in this session (name + description + file path). Skill bodies live on disk at the listed paths. Use the ${oc} tool to load them.`, "- Trigger rules: If the user names a skill (with `$SkillName` or plain text) OR the task clearly matches a skill's description shown above, you must use that skill for that turn. Multiple mentions mean use them all. Do not carry skills across turns unless re-mentioned.", "- Missing/blocked: If a named skill isn't in the list or the path can't be read, say so briefly and continue with the best fallback.", "- How to use a skill (progressive disclosure):", `  1) After deciding to use a skill, call the ${oc} tool to load it. Read only enough to follow the workflow.`, "  2) When `SKILL.md` references relative paths (e.g., `scripts/foo.py`), resolve them relative to the skill directory listed above first.", "  3) If `SKILL.md` points to extra folders such as `references/`, load only the specific files needed for the request; don't bulk-load everything.", "  4) If `scripts/` exist, prefer running or patching them instead of retyping large code blocks.", "  5) If `assets/` or templates exist, reuse them instead of recreating from scratch.", "- Context hygiene:", "  - Keep context small: summarize long sections instead of pasting them; only load extra files when needed.", "  - Avoid deep reference-chasing: prefer opening only files directly linked from `SKILL.md` unless you're blocked.", "- Safety and fallback: If a skill can't be applied cleanly (missing files, unclear instructions), state the issue, pick the next-best approach, and continue."].join(`
`);
}
function GkR(T, R, a = () => !0) {
  let e = R();
  for (let [t, r] of T) {
    if (!a(r, t)) continue;
    let h = e.get(t);
    if (!h || r.timestamp >= h.timestamp) e.set(t, r);
  }
  return e;
}
function I7T(T, R = () => !0) {
  function* a() {
    for (let e of T.values()) yield* e;
  }
  return GkR(a(), () => new xh(), R);
}
async function g7T(T, R, a) {
  if (R <= 0) throw Error("chunkSize must be greater than 0");
  if (T.length === 0) return;
  for (let e = 0; e < T.length; e += R) await Promise.all(T.slice(e, e + R).map(a));
}
async function $7T(T, R = () => !0) {
  let a = await T.getAllRecords(),
    e = I7T(a, (r, h) => !r.reverted && R(h)),
    t = [];
  for (let [r, h] of e.entries()) {
    let {
      added: i,
      removed: c,
      modified: s,
      created: A,
      reverted: l
    } = KkR(h);
    if (!i && !c && !s) continue;
    t.push({
      created: A,
      uri: d0(r),
      reverted: l,
      diff: void 0,
      after: void 0,
      diffStat: {
        added: i,
        removed: c,
        modified: s
      }
    });
  }
  return t;
}
function KkR(T) {
  let R = T.diff.split(`
`),
    a = 0,
    e = 0,
    t = 0;
  for (let i of R) {
    if (i.startsWith("+") && !i.startsWith("+++")) a++;
    if (i.startsWith("-") && !i.startsWith("---")) e++;
    if (i.startsWith("@")) t++;
  }
  let r = T.reverted,
    h = T.isNewFile === !0;
  if (h) a = T.after.split(`
`).length, e = 0, t = 0;
  return {
    added: a,
    removed: e,
    modified: t,
    created: h,
    reverted: r
  };
}
function QkR(T) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(T);
}
class Im {
  fs;
  constructor(T) {
    this.fs = T;
  }
  async store(T, R, a) {
    let e = this.backupDirForThread(T);
    if (!e) return;
    await this.fs.mkdirp(e);
    let t = MR.joinPath(e, this.filename(R));
    await this.fs.writeFile(t, JSON.stringify(a, null, 2)), await this.invalidateBackfillMarker(e);
  }
  async invalidateBackfillMarker(T) {
    let R = MR.joinPath(T, VkR);
    try {
      await this.fs.delete(R);
    } catch {}
  }
  async load(T, R) {
    let a = this.backupDirForThread(T);
    if (!a) return null;
    try {
      let e = await this.fs.readFile(MR.joinPath(a, this.filename(R)));
      return JSON.parse(e);
    } catch (e) {
      return J.error(`Error loading backup file ${this.filename(R)}:`, e), null;
    }
  }
  async list(T) {
    let R = this.backupDirForThread(T);
    if (!R) return [];
    await this.fs.mkdirp(R);
    try {
      let a = await this.fs.readdir(R),
        e = [];
      for (let t of a) {
        let r = MR.relativePath(R, t.uri);
        if (!r) continue;
        let h = r.split(".");
        if (h.length === 2) {
          let i = h[0],
            c = h[1];
          if (i && QkR(c)) e.push({
            toolUseID: i,
            fileChangeID: c
          });
        }
      }
      return e;
    } catch (a) {
      return J.error("Error listing backup files:", a), [];
    }
  }
  async cleanup(T) {
    let R = this.backupDirForThread(T);
    if (!R) return;
    try {
      await this.fs.delete(R, {
        recursive: !0
      });
    } catch (a) {
      if (!Er(a)) J.error(`Error cleaning up backup files in ${R}:`, a);
    }
  }
  getRootURI() {
    let T = typeof process < "u" ? YkR.homedir() : null;
    if (!T) return null;
    return MR.joinPath(zR.file(T), ".amp", "file-changes");
  }
  filename(T) {
    return `${T.toolUseID}.${T.fileChangeID}`;
  }
  backupDirForThread(T) {
    let R = this.getRootURI();
    if (!R) return null;
    return MR.joinPath(R, T);
  }
}
function rc(T, ...R) {
  throw Error(`[Immer] minified error nr: ${T}. Full error at: https://bit.ly/3cXEKWf`);
}
function uk(T) {
  return !!T && !!T[Cr];
}
function wb(T) {
  if (!T) return !1;
  return v7T(T) || Array.isArray(T) || !!T[UG] || !!T.constructor?.[UG] || zN(T) || FN(T);
}
function v7T(T) {
  if (!T || typeof T !== "object") return !1;
  let R = Nb(T);
  if (R === null) return !0;
  let a = Object.hasOwnProperty.call(R, "constructor") && R.constructor;
  if (a === Object) return !0;
  return typeof a == "function" && Function.toString.call(a) === E7T;
}
function a7(T, R) {
  if (qN(T) === 0) Reflect.ownKeys(T).forEach(a => {
    R(a, T[a], T);
  });else T.forEach((a, e) => R(e, a, T));
}
function qN(T) {
  let R = T[Cr];
  return R ? R.type_ : Array.isArray(T) ? 1 : zN(T) ? 2 : FN(T) ? 3 : 0;
}
function LG(T, R) {
  return qN(T) === 2 ? T.has(R) : Object.prototype.hasOwnProperty.call(T, R);
}
function j7T(T, R, a) {
  let e = qN(T);
  if (e === 2) T.set(R, a);else if (e === 3) T.add(a);else T[R] = a;
}
function ZkR(T, R) {
  if (T === R) return T !== 0 || 1 / T === 1 / R;else return T !== T && R !== R;
}
function zN(T) {
  return T instanceof Map;
}
function FN(T) {
  return T instanceof Set;
}
function g_(T) {
  return T.copy_ || T.base_;
}
function MG(T, R) {
  if (zN(T)) return new Map(T);
  if (FN(T)) return new Set(T);
  if (Array.isArray(T)) return Array.prototype.slice.call(T);
  let a = v7T(T);
  if (R === !0 || R === "class_only" && !a) {
    let e = Object.getOwnPropertyDescriptors(T);
    delete e[Cr];
    let t = Reflect.ownKeys(e);
    for (let r = 0; r < t.length; r++) {
      let h = t[r],
        i = e[h];
      if (i.writable === !1) i.writable = !0, i.configurable = !0;
      if (i.get || i.set) e[h] = {
        configurable: !0,
        writable: !0,
        enumerable: i.enumerable,
        value: T[h]
      };
    }
    return Object.create(Nb(T), e);
  } else {
    let e = Nb(T);
    if (e !== null && a) return {
      ...T
    };
    let t = Object.create(e);
    return Object.assign(t, T);
  }
}
function JA(T, R = !1) {
  if (GN(T) || uk(T) || !wb(T)) return T;
  if (qN(T) > 1) T.set = T.add = T.clear = T.delete = JkR;
  if (Object.freeze(T), R) Object.entries(T).forEach(([a, e]) => JA(e, !0));
  return T;
}
function JkR() {
  rc(2);
}
function GN(T) {
  return Object.isFrozen(T);
}
function Bb(T) {
  let R = C7T[T];
  if (!R) rc(0, T);
  return R;
}
function S7T() {
  return Uj;
}
function TxR(T, R) {
  return {
    drafts_: [],
    parent_: T,
    immer_: R,
    canAutoFreeze_: !0,
    unfinalizedDrafts_: 0
  };
}
function jlT(T, R) {
  if (R) Bb("Patches"), T.patches_ = [], T.inversePatches_ = [], T.patchListener_ = R;
}
function DG(T) {
  wG(T), T.drafts_.forEach(RxR), T.drafts_ = null;
}
function wG(T) {
  if (T === Uj) Uj = T.parent_;
}
function SlT(T) {
  return Uj = TxR(Uj, T);
}
function RxR(T) {
  let R = T[Cr];
  if (R.type_ === 0 || R.type_ === 1) R.revoke_();else R.revoked_ = !0;
}
function OlT(T, R) {
  R.unfinalizedDrafts_ = R.drafts_.length;
  let a = R.drafts_[0];
  if (T !== void 0 && T !== a) {
    if (a[Cr].modified_) DG(R), rc(4);
    if (wb(T)) {
      if (T = e7(R, T), !R.parent_) t7(R, T);
    }
    if (R.patches_) Bb("Patches").generateReplacementPatches_(a[Cr].base_, T, R.patches_, R.inversePatches_);
  } else T = e7(R, a, []);
  if (DG(R), R.patches_) R.patchListener_(R.patches_, R.inversePatches_);
  return T !== R8T ? T : void 0;
}
function e7(T, R, a) {
  if (GN(R)) return R;
  let e = R[Cr];
  if (!e) return a7(R, (t, r) => dlT(T, e, R, t, r, a)), R;
  if (e.scope_ !== T) return R;
  if (!e.modified_) return t7(T, e.base_, !0), e.base_;
  if (!e.finalized_) {
    e.finalized_ = !0, e.scope_.unfinalizedDrafts_--;
    let t = e.copy_,
      r = t,
      h = !1;
    if (e.type_ === 3) r = new Set(t), t.clear(), h = !0;
    if (a7(r, (i, c) => dlT(T, e, t, i, c, a, h)), t7(T, t, !1), a && T.patches_) Bb("Patches").generatePatches_(e, a, T.patches_, T.inversePatches_);
  }
  return e.copy_;
}
function dlT(T, R, a, e, t, r, h) {
  if (uk(t)) {
    let i = r && R && R.type_ !== 3 && !LG(R.assigned_, e) ? r.concat(e) : void 0,
      c = e7(T, t, i);
    if (j7T(a, e, c), uk(c)) T.canAutoFreeze_ = !1;else return;
  } else if (h) a.add(t);
  if (wb(t) && !GN(t)) {
    if (!T.immer_.autoFreeze_ && T.unfinalizedDrafts_ < 1) return;
    if (e7(T, t), (!R || !R.scope_.parent_) && typeof e !== "symbol" && Object.prototype.propertyIsEnumerable.call(a, e)) t7(T, t);
  }
}
function t7(T, R, a = !1) {
  if (!T.parent_ && T.immer_.autoFreeze_ && T.canAutoFreeze_) JA(R, a);
}
function axR(T, R) {
  let a = Array.isArray(T),
    e = {
      type_: a ? 1 : 0,
      scope_: R ? R.scope_ : S7T(),
      modified_: !1,
      finalized_: !1,
      assigned_: {},
      parent_: R,
      base_: T,
      draft_: null,
      copy_: null,
      revoke_: null,
      isManual_: !1
    },
    t = e,
    r = DL;
  if (a) t = [e], r = xy;
  let {
    revoke: h,
    proxy: i
  } = Proxy.revocable(t, r);
  return e.draft_ = i, e.revoke_ = h, i;
}
function zq(T, R) {
  let a = T[Cr];
  return (a ? g_(a) : T)[R];
}
function exR(T, R, a) {
  let e = O7T(R, a);
  return e ? "value" in e ? e.value : e.get?.call(T.draft_) : void 0;
}
function O7T(T, R) {
  if (!(R in T)) return;
  let a = Nb(T);
  while (a) {
    let e = Object.getOwnPropertyDescriptor(a, R);
    if (e) return e;
    a = Nb(a);
  }
  return;
}
function BG(T) {
  if (!T.modified_) {
    if (T.modified_ = !0, T.parent_) BG(T.parent_);
  }
}
function Fq(T) {
  if (!T.copy_) T.copy_ = MG(T.base_, T.scope_.immer_.useStrictShallowCopy_);
}
function NG(T, R) {
  let a = zN(T) ? Bb("MapSet").proxyMap_(T, R) : FN(T) ? Bb("MapSet").proxySet_(T, R) : axR(T, R);
  return (R ? R.scope_ : S7T()).drafts_.push(a), a;
}
function txR(T) {
  if (!uk(T)) rc(10, T);
  return d7T(T);
}
function d7T(T) {
  if (!wb(T) || GN(T)) return T;
  let R = T[Cr],
    a;
  if (R) {
    if (!R.modified_) return R.base_;
    R.finalized_ = !0, a = MG(T, R.scope_.immer_.useStrictShallowCopy_);
  } else a = MG(T, !0);
  if (a7(a, (e, t) => {
    j7T(a, e, d7T(t));
  }), R) R.finalized_ = !1;
  return a;
}
function O8(T) {
  return T;
}
function ElT(T) {
  return JSON.stringify(T) ?? "";
}
function nA(T) {
  if (T.length > Hj) return T.slice(0, Hj) + r7;
  return T;
}
function a8T(T) {
  if (typeof T === "string") return nA(T);
  if (Array.isArray(T)) {
    let R = 0,
      a = [];
    for (let e of T) {
      let t = e;
      if (typeof e === "string") t = nA(e);else if (typeof e === "object" && e !== null) t = HG(e);
      let r = typeof t === "string" ? t : ElT(t),
        h = typeof e === "string" ? e : ElT(e);
      if (R + r.length > Hj) {
        if (R === 0 && h.length > r.length) a.push(t);else a.push(r7);
        break;
      }
      R += r.length, a.push(t);
    }
    return a;
  }
  if (typeof T === "object" && T !== null && !Array.isArray(T)) {
    let R = {
      ...T
    };
    for (let a of e8T) if (a in R && typeof R[a] === "string") R[a] = nA(R[a]);
    return R;
  }
  return T;
}
function lxR(T) {
  if (T === void 0) return;
  if (typeof T === "string") return nA(T);
  if (Array.isArray(T)) {
    if (T.length > 0 && typeof T[0] === "string") {
      let R = 0,
        a = [];
      for (let e of T) if (typeof e === "string") {
        let t = nA(e);
        if (R + t.length > Hj) {
          a.push(r7);
          break;
        }
        R += t.length, a.push(t);
      }
      return a;
    }
    if (T.length > 0 && typeof T[0] === "object") {
      let R = 0,
        a = [];
      for (let e of T) if (typeof e === "object" && e !== null) {
        let t = HG(e),
          r = JSON.stringify(t);
        if (R + r.length > Hj) {
          a.push({
            truncated: r7
          });
          break;
        }
        R += r.length, a.push(t);
      }
      return a;
    }
  }
  if (typeof T === "object" && T !== null) return HG(T);
  return T;
}
function HG(T) {
  let R = JSON.parse(JSON.stringify(T));
  for (let a of e8T) if (a in R && typeof R[a] === "string") R[a] = nA(R[a]);
  return R;
}
function L7T(T) {
  let R = Lt(T, a => {
    let e = 0,
      t = 0;
    for (let r of a.messages) if (r.role === "user") {
      if (r.fileMentions) {
        if (r.fileMentions = void 0, e++, !r.content.some(h => h.type === "tool_result" || h.type === "image" || h.type === "text" && h.text.trim().length > 0)) r.content.push({
          type: "text",
          text: "(file mentions removed)"
        });
      }
      for (let h of r.content) if (h.type === "tool_result") {
        if (h.run.status === "done") {
          let i = h.run.result,
            c = a8T(h.run.result);
          if (i !== c) h.run.result = c, t++;
        } else if (h.run.status === "cancelled" && h.run.progress) h.run.progress = O8(lxR(h.run.progress));else if (h.run.status === "error" && h.run.error) {
          let i = h.run.error.message,
            c = nA(h.run.error.message);
          if (i !== c) h.run.error.message = c, t++;
        }
      }
    }
  });
  return J.debug("Truncated thread", {
    messages: R.messages
  }), R;
}
function KN(T, R, a = {}) {
  let e = [];
  if (e.push(AxR(T, R)), T.title) e.push(`# ${T.title}`);
  let t = pm(T),
    r = t ? t.index : 0;
  for (let i = r; i < T.messages.length; i++) {
    let c = T.messages[i];
    if (c) e.push(pxR(c, a));
  }
  let h = O0T(T);
  if (h) e.push($xR(h));
  return e.join(`

`);
}
function AxR(T, R) {
  let a = ["---"];
  if (T.title) a.push(`title: ${T.title}`);
  if (R) a.push(`author: ${R}`);
  if (a.push(`threadId: ${T.id}`), a.push(`created: ${new Date(T.created).toISOString()}`), T.agentMode) a.push(`agentMode: ${T.agentMode}`);
  return a.push("---"), a.join(`
`);
}
function pxR(T, R) {
  switch (T.role) {
    case "user":
      return _xR(T, R);
    case "assistant":
      return bxR(T);
    case "info":
      return mxR(T, R);
  }
}
function _xR(T, R) {
  let a = ["## User"];
  if (T.interrupted) a.push("*(interrupted)*");
  let e = [];
  for (let t of T.content) switch (t.type) {
    case "text":
      e.push(r8T(t, !0));
      break;
    case "image":
      a.push(uxR(t));
      break;
    case "tool_result":
      a.push(fxR(t, R));
      break;
  }
  if (T.fileMentions) a.push(yxR(T.fileMentions));
  return a.push(...e), a.join(`

`);
}
function bxR(T) {
  let R = ["## Assistant"];
  if (T.state.type === "streaming") R.push("*(streaming)*");else if (T.state.type === "cancelled") R.push("*(cancelled)*");else if (T.state.type === "error") R.push(`*(error: ${T.state.error.message})*`);
  for (let a of T.content) switch (a.type) {
    case "text":
      R.push(r8T(a, !0));
      break;
    case "thinking":
      break;
    case "redacted_thinking":
      break;
    case "tool_use":
      R.push(kxR(a));
      break;
  }
  return R.join(`

`);
}
function mxR(T, R) {
  let a = ["## Info"];
  for (let e of T.content) switch (e.type) {
    case "text":
      a.push(r8T(e, !0));
      break;
    case "summary":
      a.push(gxR(e));
      break;
    case "manual_bash_invocation":
      if (!e.hidden) a.push(vxR(e, R));
      break;
  }
  return a.join(`

`);
}
function r8T(T, R = !1) {
  if (!R) return T.text;
  return T.text.replace(/^(#{1,5}) /gm, "#$1 ");
}
function uxR(T) {
  if (T.source.type === "url") return `![Image](${T.source.url})`;
  return `![Image](data:${T.source.mediaType};base64,${T.source.data.slice(0, 50)}...)`;
}
function yxR(T) {
  let R = [];
  for (let a of T.files) R.push(PxR(a));
  return `<attached_files>
${R.join(`
`)}
</attached_files>`;
}
function PxR(T) {
  if (T.isImage && T.imageInfo) return `\`\`\`${T.uri}
This is an image file (${T.imageInfo.mimeType}, ${Math.round(T.imageInfo.size / 1024)} KB)
\`\`\``;
  let R = T.content.split(`
`),
    a = R[R.length - 1] === "" ? R.slice(0, -1) : R;
  if (a.length <= Gq) {
    let r = a.map((h, i) => `${i + 1}: ${h}`).join(`
`);
    return `\`\`\`${T.uri}
${r}
\`\`\``;
  }
  let e = a.slice(0, Gq).map((r, h) => `${h + 1}: ${r}`).join(`
`),
    t = a.length - Gq;
  return `\`\`\`${T.uri}
${e}
... (${t} more lines)
\`\`\``;
}
function kxR(T) {
  let R = [`**Tool Use:** \`${T.name}\``],
    a = xxR(T.name, T.input),
    e = JSON.stringify(a, null, 2);
  return R.push("```json\n" + e + "\n```"), R.join(`

`);
}
function xxR(T, R) {
  if (T !== "edit_file" || typeof R !== "object" || R === null) return R;
  let a = R,
    e = {};
  for (let [t, r] of Object.entries(a)) if (t === "old_str") e[t] = "[... old_str omitted in markdown version ...]";else if (t === "new_str") e[t] = "[... new_str omitted in markdown version ...]";else e[t] = r;
  return e;
}
function fxR(T, R) {
  let a = [];
  if (T.run.status === "done") {
    a.push(`**Tool Result:** \`${T.toolUseID}\``);
    let e = IxR(T.run.result, R),
      t = typeof e === "string" ? e : JSON.stringify(e, null, 2);
    a.push("```\n" + t + "\n```");
  } else if (T.run.status === "error") {
    a.push(`**Tool Error:** \`${T.toolUseID}\``);
    let e = JSON.stringify(T.run.error),
      t = typeof T.run.error === "string" ? T.run.error : e ?? "Unknown error",
      r = R.truncateToolResults ? nA(t) : t;
    a.push(`**Error:** ${r}`);
  } else if (T.run.status === "cancelled") a.push(`**Tool Cancelled:** \`${T.toolUseID}\``);else if (T.run.status === "in-progress") a.push(`**Tool In Progress:** \`${T.toolUseID}\``);else a.push(`**Tool:** \`${T.toolUseID}\` (${T.run.status})`);
  return a.join(`

`);
}
function IxR(T, R) {
  let a = T;
  if (Array.isArray(T)) a = T.filter(r => {
    if (r && typeof r === "object" && "type" in r && r.type === "image") return !1;
    return !0;
  });
  if (R.truncateToolResults) a = a8T(a);
  let e = JSON.stringify(a) ?? "undefined",
    t = Buffer.byteLength(e, "utf8");
  if (t > 102400) {
    let r = Math.round(100),
      h = Math.round(t / 1024);
    if (Array.isArray(a)) return [`[Tool result truncated: ${h}KB exceeds limit of ${r}KB. Please refine the query.]`];
    return `[Tool result truncated: ${h}KB exceeds limit of ${r}KB. Please refine the query.]`;
  }
  return a;
}
function gxR(T) {
  if (T.summary.type === "message") return `**Summary:**

${T.summary.summary}`;
  return `**Summary Thread:** ${T.summary.thread}`;
}
function $xR(T) {
  let R = ["## Todos"];
  if (typeof T === "string") R.push(T);else for (let a of T) {
    let e = a.status === "completed" ? "[x]" : a.status === "in-progress" ? "[~]" : "[ ]",
      t = a.status === "in-progress" ? " (in progress)" : "";
    R.push(`- ${e} ${a.content}${t}`);
  }
  return R.join(`
`);
}
function vxR(T, R) {
  let a = ["**Manual Bash Invocation**"];
  if (a.push("```bash\n" + T.args.cmd + "\n```"), T.toolRun.status === "done") {
    let e = R.truncateToolResults ? a8T(T.toolRun.result) : T.toolRun.result,
      t = typeof e === "string" ? e : JSON.stringify(e, null, 2);
    a.push("```\n" + t + "\n```");
  }
  return a.join(`

`);
}
function $0(T, R, a, e, t) {
  if (e === "m") throw TypeError("Private method is not writable");
  if (e === "a" && !t) throw TypeError("Private accessor was defined without a setter");
  if (typeof R === "function" ? T !== R || !t : !R.has(T)) throw TypeError("Cannot write private member to an object whose class did not declare it");
  return e === "a" ? t.call(T, a) : t ? t.value = a : R.set(T, a), a;
}
function mR(T, R, a, e) {
  if (a === "a" && !e) throw TypeError("Private accessor was defined without a getter");
  if (typeof R === "function" ? T !== R || !e : !R.has(T)) throw TypeError("Cannot read private member from an object whose class did not declare it");
  return a === "m" ? e : a === "a" ? e.call(T) : e ? e.value : R.get(T);
}
function Wj(T) {
  return typeof T === "object" && T !== null && ("name" in T && T.name === "AbortError" || "message" in T && String(T.message).includes("FetchRequestCanceledException"));
}
function Kq(T) {
  if (typeof T !== "object") return {};
  return T ?? {};
}
function jxR(T) {
  if (!T) return !0;
  for (let R in T) return !1;
  return !0;
}
function SxR(T, R) {
  return Object.prototype.hasOwnProperty.call(T, R);
}
function CxR() {
  if (typeof Deno < "u" && Deno.build != null) return "deno";
  if (typeof EdgeRuntime < "u") return "edge";
  if (Object.prototype.toString.call(typeof globalThis.process < "u" ? globalThis.process : 0) === "[object process]") return "node";
  return "unknown";
}