class hTR {
  constructor(T) {
    if (this.options = T, this.currentNode = null, this.tagsNodeStack = [], this.docTypeEntities = {}, this.lastEntities = {
      apos: {
        regex: /&(apos|#39|#x27);/g,
        val: "'"
      },
      gt: {
        regex: /&(gt|#62|#x3E);/g,
        val: ">"
      },
      lt: {
        regex: /&(lt|#60|#x3C);/g,
        val: "<"
      },
      quot: {
        regex: /&(quot|#34|#x22);/g,
        val: '"'
      }
    }, this.ampEntity = {
      regex: /&(amp|#38|#x26);/g,
      val: "&"
    }, this.htmlEntities = {
      space: {
        regex: /&(nbsp|#160);/g,
        val: " "
      },
      cent: {
        regex: /&(cent|#162);/g,
        val: "\xA2"
      },
      pound: {
        regex: /&(pound|#163);/g,
        val: "\xA3"
      },
      yen: {
        regex: /&(yen|#165);/g,
        val: "\xA5"
      },
      euro: {
        regex: /&(euro|#8364);/g,
        val: "\u20AC"
      },
      copyright: {
        regex: /&(copy|#169);/g,
        val: "\xA9"
      },
      reg: {
        regex: /&(reg|#174);/g,
        val: "\xAE"
      },
      inr: {
        regex: /&(inr|#8377);/g,
        val: "\u20B9"
      },
      num_dec: {
        regex: /&#([0-9]{1,7});/g,
        val: (R, a) => String.fromCodePoint(Number.parseInt(a, 10))
      },
      num_hex: {
        regex: /&#x([0-9a-fA-F]{1,6});/g,
        val: (R, a) => String.fromCodePoint(Number.parseInt(a, 16))
      }
    }, this.addExternalEntities = yw0, this.parseXml = Iw0, this.parseTextData = Pw0, this.resolveNameSpace = kw0, this.buildAttributesMap = fw0, this.isItStopNode = jw0, this.replaceEntitiesValue = $w0, this.readStopNodeData = Ow0, this.saveTextToParentTag = vw0, this.addChild = gw0, this.ignoreAttributesFn = uw0(this.options.ignoreAttributes), this.options.stopNodes && this.options.stopNodes.length > 0) {
      this.stopNodesExact = new Set(), this.stopNodesWildcard = new Set();
      for (let R = 0; R < this.options.stopNodes.length; R++) {
        let a = this.options.stopNodes[R];
        if (typeof a !== "string") continue;
        if (a.startsWith("*.")) this.stopNodesWildcard.add(a.substring(2));else this.stopNodesExact.add(a);
      }
    }
  }
}