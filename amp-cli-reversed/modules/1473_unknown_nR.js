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