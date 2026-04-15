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