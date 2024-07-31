(function(jsPDFAPI) {
    "use strict";

    var namesOid;

    jsPDFAPI.events.push([
        "postPutResources",
        function() {
            var pdf = this;

            var rx = /^(\d+) 0 obj$/;

            if (this.outline.root.children.length > 0) {
                var lines = pdf.outline.render().split(/\r\n/);

                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i];
                    var m = rx.exec(line);

                    if (m != null) {
                        var oid = m[1];
                        pdf.internal.newObjectDeferredBegin(oid, false);
                    }

                    pdf.internal.write(line);
                }
            }

            if (this.outline.createNamedDestinations) {
                var totalPages = this.internal.pages.length;
                var dests = [];

                for (var i = 0; i < totalPages; i++) {
                    var id = pdf.internal.newObject();
                    dests.push(id);
                    var info = pdf.internal.getPageInfo(i + 1);
                    pdf.internal.write("<< /D[" + info.objId + " 0 R /XYZ null null null]>> endobj");
                }

                var names2Oid = pdf.internal.newObject();
                pdf.internal.write("<< /Names [ ");
                for (var i = 0; i < dests.length; i++) {
                    pdf.internal.write("(page_" + (i + 1) + ")" + dests[i] + " 0 R");
                }
                pdf.internal.write(" ] >>", "endobj");

                namesOid = pdf.internal.newObject();
                pdf.internal.write("<< /Dests " + names2Oid + " 0 R");
                pdf.internal.write(">>", "endobj");
            }
        }
    ]);

    jsPDFAPI.events.push([
        "putCatalog",
        function() {
            var pdf = this;

            if (pdf.outline.root.children.length > 0) {
                pdf.internal.write("/Outlines", this.outline.makeRef(this.outline.root));

                if (this.outline.createNamedDestinations) {
                    pdf.internal.write("/Names " + namesOid + " 0 R");
                }
            }
        }
    ]);

    jsPDFAPI.events.push([
        "initialized",
        function() {
            var pdf = this;
            pdf.outline = {
                createNamedDestinations: false,
                root: { children: [] }
            };

            pdf.outline.add = function(parent, title, options) {
                var item = { title: title, options: options, children: [] };
                if (parent == null) {
                    parent = this.root;
                }
                parent.children.push(item);
                return item;
            };

            pdf.outline.render = function() {
                this.ctx = {};
                this.ctx.val = "";
                this.ctx.pdf = pdf;
                this.genIds_r(this.root);
                this.renderRoot(this.root);
                this.renderItems(this.root);
                return this.ctx.val;
            };

            pdf.outline.genIds_r = function(node) {
                node.id = pdf.internal.newObjectDeferred();
                for (var i = 0; i < node.children.length; i++) {
                    this.genIds_r(node.children[i]);
                }
            };

            pdf.outline.renderRoot = function(node) {
                this.objStart(node);
                this.line("/Type /Outlines");

                if (node.children.length > 0) {
                    this.line("/First " + this.makeRef(node.children[0]));
                    this.line("/Last " + this.makeRef(node.children[node.children.length - 1]));
                }

                this.line("/Count " + this.count_r({ count: 0 }, node));
                this.objEnd();
            };

            pdf.outline.renderItems = function(node) {
                var getVerticalCoordinateString = this.ctx.pdf.internal.getVerticalCoordinateString;
                for (var i = 0; i < node.children.length; i++) {
                    var item = node.children[i];
                    this.objStart(item);
                    this.line("/Title " + this.makeString(item.title));
                    this.line("/Parent " + this.makeRef(node));

                    if (i > 0) {
                        this.line("/Prev " + this.makeRef(node.children[i - 1]));
                    }

                    if (i < node.children.length - 1) {
                        this.line("/Next " + this.makeRef(node.children[i + 1]));
                    }

                    if (item.children.length > 0) {
                        this.line("/First " + this.makeRef(item.children[0]));
                        this.line("/Last " + this.makeRef(item.children[item.children.length - 1]));
                    }

                    var count = this.count_r({ count: 0 }, item);
                    if (count > 0) {
                        this.line("/Count " + count);
                    }

                    if (item.options) {
                        if (item.options.pageNumber) {
                            var info = pdf.internal.getPageInfo(item.options.pageNumber);
                            this.line("/Dest [" + info.objId + " 0 R /XYZ 0 " + getVerticalCoordinateString(0) + " 0]");
                        }
                    }

                    this.objEnd();
                }

                for (var z = 0; z < node.children.length; z++) {
                    this.renderItems(node.children[z]);
                }
            };

            pdf.outline.line = function(text) {
                this.ctx.val += text + "\r\n";
            };

            pdf.outline.makeRef = function(node) {
                return node.id + " 0 R";
            };

            pdf.outline.makeString = function(val) {
                return "(" + pdf.internal.pdfEscape(val) + ")";
            };

            pdf.outline.objStart = function(node) {
                this.ctx.val += "\r\n" + node.id + " 0 obj" + "\r\n<<\r\n";
            };

            pdf.outline.objEnd = function() {
                this.ctx.val += ">> \r\nendobj\r\n";
            };

            pdf.outline.count_r = function(ctx, node) {
                for (var i = 0; i < node.children.length; i++) {
                    ctx.count++;
                    this.count_r(ctx, node.children[i]);
                }
                return ctx.count;
            };
        }
    ]);

    return this;
})(window.jspdf.jsPDF.API);
