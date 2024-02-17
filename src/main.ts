import ballImage from "./ball.png";

{
  var browserball = (function () {
    var q = false;
    var b = 1,
      a = 0.89,
      c = 0.97,
      s = 15;
    const ball = {
      dragging: true,
      img: new Image(),
      angle: 0,
      rotation: 0,
      scale: 1,
      w: 90,
      h: 90,
      radius: 0,
      x: 0,
      y: 0,
      offset: {
        x: 0,
        y: 0,
      },
      drag_point: {
        x: 0,
        y: 0,
      },
      velocity: {
        x: 0,
        y: 0,
      },
      inside: function (u, v) {
        return (
          this.offset.x >=
          Math.sqrt((this.x - u) * (this.x - u) + (this.y - v) * (this.y - v))
        );
      },
    };

    var o = {
      x0: Infinity,
      y0: Infinity,
      update: function () {
        var x,
          w,
          v = o.x0,
          A = o.y0,
          z;
        for (var y = 0, u = e.list.length; y < u; y++) {
          z = e.list[y].ref;
          x = x < z.screenX ? x : z.screenX;
          w = w < z.screenY ? w : z.screenY;
        }
        o.x0 = x;
        o.y0 = w;
        ball.x += v - x;
        ball.y += A - w;
      },
    };
    var e = {
      list: [],
      corners: [],
      add: function (u) {
        u.quad_ref = e.list.length;
        this.list.push({
          ref: u,
          canvas: u.document.getElementById("stage"),
          context: u.document.getElementById("stage").getContext("2d"),
          x1: u.screenX - o.x0,
          y1: u.screenY - o.y0,
          x2: u.screenX + u.innerWidth - o.x0,
          y2: u.screenY + u.innerHeight - o.y0,
        });
        o.update();
        e.update();
      },
      remove: function (v) {
        var x = e.list.splice(v, 1)[0];
        x.canvas = x.context = null;
        for (var w = 0, u = e.list.length; w < u; w++) {
          e.list[w].ref.quad_ref = w;
        }
        return x.ref;
      },
      update: function () {
        var x,
          w,
          u,
          y = e.list;
        e.corners = [];
        for (x = 0, u = y.length; x < u; x++) {
          y[x].x1 = y[x].ref.screenX - o.x0;
          y[x].y1 = y[x].ref.screenY - o.y0;
          y[x].x2 = y[x].ref.screenX + y[x].ref.innerWidth - o.x0;
          y[x].y2 = y[x].ref.screenY + y[x].ref.innerHeight - o.y0;
        }
        for (x = 0; x < u - 1; x++) {
          for (w = x + 1; w < u; w++) {
            e.findWorldCorners(y[x], y[w]);
          }
        }
      },
      findWorldCorners: function (z, y) {
        var E = [
            {
              x1: z.x1,
              y1: z.y1,
              x2: z.x2,
              y2: z.y1,
            },
            {
              x1: z.x2,
              y1: z.y1,
              x2: z.x2,
              y2: z.y2,
            },
            {
              x1: z.x2,
              y1: z.y2,
              x2: z.x1,
              y2: z.y2,
            },
            {
              x1: z.x1,
              y1: z.y2,
              x2: z.x1,
              y2: z.y1,
            },
          ],
          C = [
            {
              x1: y.x1,
              y1: y.y1,
              x2: y.x2,
              y2: y.y1,
            },
            {
              x1: y.x2,
              y1: y.y1,
              x2: y.x2,
              y2: y.y2,
            },
            {
              x1: y.x2,
              y1: y.y2,
              x2: y.x1,
              y2: y.y2,
            },
            {
              x1: y.x1,
              y1: y.y2,
              x2: y.x1,
              y2: y.y1,
            },
          ],
          A = null;
        var v, u, x, D, B;
        for (v = 0; v < 4; v++) {
          for (u = (v + 1) % 4, x = 0; x < 2; u = (u + 2) % 4, x++) {
            A = e.sIntersection(E[v], C[u]);
            if (A && !e.pInsideAny(A.x, A.y)) {
              D = 0;
              B = 0;
              if (E[v].x1 == E[v].x2) {
                (D = E[v].y1 < E[v].y2 ? 1 : -1),
                  (B = C[u].x1 < C[u].x2 ? -1 : 1);
              } else {
                (D = C[u].y1 < C[u].y2 ? 1 : -1),
                  (B = E[v].x1 < E[v].x2 ? -1 : 1);
              }
              e.corners.push({
                x: A.x,
                y: A.y,
                dx: D,
                dy: B,
              });
            }
          }
        }
      },
      sIntersection: function (w, v) {
        var z = {
            x1: w.x1,
            y1: w.y1,
            x2: w.x2,
            y2: w.y2,
          },
          y = {
            x1: v.x1,
            y1: v.y1,
            x2: v.x2,
            y2: v.y2,
          },
          u = null,
          x;
        if (z.x1 > z.x2) {
          x = z.x1;
          z.x1 = z.x2;
          z.x2 = x;
        }
        if (z.y1 > z.y2) {
          x = z.y1;
          z.y1 = z.y2;
          z.y2 = x;
        }
        if (y.x1 > y.x2) {
          x = y.x1;
          y.x1 = y.x2;
          y.x2 = x;
        }
        if (y.y1 > y.y2) {
          x = y.y1;
          y.y1 = y.y2;
          y.y2 = x;
        }
        if (z.x1 == z.x2) {
          if (z.x1 >= y.x1 && z.x1 <= y.x2 && y.y1 >= z.y1 && y.y2 <= z.y2) {
            u = {
              x: z.x1,
              y: y.y1,
            };
          }
        } else {
          if (y.x1 >= z.x1 && y.x1 <= z.x2 && z.y1 >= y.y1 && z.y2 <= y.y2) {
            u = {
              x: y.x1,
              y: z.y1,
            };
          }
        }
        return u;
      },
      pInside: function (u, w, v) {
        return !!(u >= v.x1 && u <= v.x2 && w >= v.y1 && w <= v.y2);
      },
      pInsideNotEdge: function (u, w, v) {
        return !!(u > v.x1 && u < v.x2 && w > v.y1 && w < v.y2);
      },
      pInsideAny: function (w, A) {
        var v = false;
        for (var z = 0, u = e.list.length; z < u && !v; z++) {
          v = e.pInsideNotEdge(w, A, e.list[z]);
        }
        return v;
      },
      sInside: function (v, B, u, A) {
        let p2;
        var C = (p2 = false),
          z = e.list,
          w = 0;
        for (var x = 0, y = z.length; x < y && !w; x++) {
          C = e.pInside(v, B, z[x]);
          p2 = e.pInside(u, A, z[x]);
          if (C && p2) {
            return v == u ? A - B : u - v;
          } else {
            if (C && !p2) {
              if (v == u) {
                return z[x].y2 - B + 1 + e.sInside(v, z[x].y2 + 1, u, A);
              } else {
                return z[x].x2 - v + 1 + e.sInside(z[x].x2 + 1, B, u, A);
              }
            } else {
              if (!C && p2) {
                if (v == u) {
                  return A - z[x].y1 + 1 + e.sInside(v, B, u, z[x].y1 - 1);
                } else {
                  return u - z[x].x1 + 1 + e.sInside(v, B, z[x].x1 - 1, A);
                }
              } else {
              }
            }
          }
        }
        return 0;
      },
    };
    var h = (function () {
      var v = null,
        u;
      return {
        down: function (z) {
          var A = z.target.ownerDocument.defaultView,
            w = A.screenX - o.x0 + z.clientX,
            B = A.screenY - o.y0 + z.clientY;
          if (ball.inside(w, B)) {
            ball.dragging = true;
            ball.rotation = 0;
            ball.drag_point.x = ball.x - w;
            ball.drag_point.y = ball.y - B;
            v = {
              x: 0,
              y: 0,
            };
            u = {
              x: w,
              y: B,
            };
            A.addEventListener("mousemove", h.track, false);
          }
        },
        track: function (z) {
          var A = z.target.ownerDocument.defaultView,
            w = A.screenX - o.x0 + z.clientX,
            B = A.screenY - o.y0 + z.clientY;
          ball.x = w + ball.drag_point.x;
          ball.y = B + ball.drag_point.y;
          v.x = w - u.x;
          v.y = B - u.y;
          u.x = w;
          u.y = B;
        },
        up: function (w) {
          var x = w.target.ownerDocument.defaultView;
          if (ball.dragging && v) {
            x.removeEventListener("mousemove", h.track, false);
            ball.velocity.x =
              Math.abs(v.x) > 20 ? (v.x < 0 ? -1 : 1) * 20 : v.x;
            ball.velocity.y =
              Math.abs(v.y) > 20 ? (v.y < 0 ? -1 : 1) * 20 : v.y;
            v = u = null;
            ball.drag_point.x = ball.drag_point.y = 0;
            ball.dragging = false;
          }
        },
      };
    })();
    var n = function (w) {
      var x = w.target.defaultView || w.target,
        u = e.list[x.quad_ref],
        v = u.canvas;
      v.width = x.innerWidth;
      v.height = x.innerHeight;
      if (q) {
        x.screenX = x.screenLeft;
        x.screenY = x.screenTop;
      }
      o.update();
      e.update();
    };
    var r = function () {
      var w = false,
        x;
      for (var v = 0, u = e.list.length; v < u; v++) {
        x = e.list[v].ref;
        if (q) {
          x.screenX = x.screenLeft;
          x.screenY = x.screenTop;
        }
        if (
          e.list[v].x1 != x.screenX - o.x0 ||
          e.list[v].y1 != x.screenY - o.y0
        ) {
          w = true;
        }
      }
      if (w) {
        o.update();
        e.update();
      }
    };
    var g = function () {
      var x = "" + (window.screenY + 100),
        w = "" + (window.screenX - 200),
        u = "300",
        v = "300";
      window.open(
        "child.html",
        "w" + e.list.length,
        "location=no,status=no,menubar=no,toolbar=no,scrollbars=no,status=no,width=" +
          v +
          ",height=" +
          u +
          ",left=" +
          w +
          ",top=" +
          x
      );
    };
    var m = function () {
      ball.dragging = true;
      ball.rotation = 0;
      ball.x = window.screenX - o.x0 + window.innerWidth / 2;
      ball.y = window.screenY - o.y0 + window.innerHeight / 2;
    };
    var t = function () {
      var O = [],
        C = 1,
        A = 0;
      O.push(
        ball.w -
          e.sInside(
            ball.x - ball.offset.x,
            ball.y - ball.offset.y,
            ball.x + ball.offset.x,
            ball.y - ball.offset.y,
            e.list.slice(0)
          )
      );
      O.push(
        ball.h -
          e.sInside(
            ball.x + ball.offset.x,
            ball.y - ball.offset.y,
            ball.x + ball.offset.x,
            ball.y + ball.offset.y,
            e.list.slice(0)
          )
      );
      O.push(
        ball.w -
          e.sInside(
            ball.x - ball.offset.x,
            ball.y + ball.offset.y,
            ball.x + ball.offset.x,
            ball.y + ball.offset.y,
            e.list.slice(0)
          )
      );
      O.push(
        ball.h -
          e.sInside(
            ball.x - ball.offset.x,
            ball.y - ball.offset.y,
            ball.x - ball.offset.x,
            ball.y + ball.offset.y,
            e.list.slice(0)
          )
      );
      if (!!O[0] || !!O[1] || !!O[2] || !!O[3]) {
        var J = 0,
          Q,
          M,
          v,
          N,
          I = 0;
        for (var K = 0; K < 4; K++) {
          if (O[K] == ball.w) {
            v = O[(K + 3) % 4];
            v = v == ball.w ? 0 : v;
            N = O[(K + 1) % 4];
            N = N == ball.w ? 0 : N;
            M = v > N ? v : N;
            if (M > J) {
              J = M;
              Q = K % 2;
            }
          } else {
            I++;
          }
        }
        if (J && Q == C) {
          ball.x -= J * (ball.velocity.x < 0 ? -1 : 1);
          ball.y -=
            Math.round((J * ball.velocity.y) / ball.velocity.x) *
            (ball.velocity.y < 0 ? -1 : 1);
          ball.velocity.x = -ball.velocity.x * a;
          ball.velocity.y = ball.velocity.y * c;
          ball.rotation = ball.velocity.y * 0.015;
        } else {
          if (J && Q == A) {
            if (ball.velocity.y > 1) {
              ball.x -=
                Math.round((J * ball.velocity.x) / ball.velocity.y) *
                (ball.velocity.x < 0 ? -1 : 1);
            }
            ball.y -= J * (ball.velocity.y < 0 ? -1 : 1);
            ball.velocity.x = ball.velocity.x * c;
            ball.velocity.y = -ball.velocity.y * a;
            ball.rotation = ball.velocity.x * 0.015;
          } else {
            var u,
              D = Number.POSITIVE_INFINITY,
              S,
              P = -1,
              G = e.corners;
            for (var K = 0, L = G.length; K < L; K++) {
              S = {
                x: ball.x - G[K].x,
                y: ball.y - G[K].y,
              };
              u = Math.sqrt(S.x * S.x + S.y * S.y);
              if (u < D) {
                P = K;
                D = u;
              }
            }
            if (P >= 0 && I != 3) {
              var R = G[P].dx > 0 ? ball.x > G[P].x : ball.x < G[P].x,
                H = G[P].dy > 0 ? ball.y > G[P].y : ball.y < G[P].y,
                w;
              if ((R && !H) || (H && !R)) {
                if (R) {
                  w = ball.radius - Math.abs(ball.y - G[P].y);
                  if (ball.velocity.y > 1) {
                    ball.x -=
                      Math.round((w * ball.velocity.x) / ball.velocity.y) *
                      (ball.velocity.x < 0 ? -1 : 1);
                  }
                  ball.y -= w * (ball.velocity.y < 0 ? -1 : 1);
                  ball.velocity.x = ball.velocity.x * c;
                  ball.velocity.y = -ball.velocity.y * a;
                  ball.rotation = ball.velocity.x * 0.015;
                } else {
                  w = ball.radius - Math.abs(ball.x - G[P].x);
                  ball.x -= w * (ball.velocity.x < 0 ? -1 : 1);
                  ball.y -=
                    Math.round((w * ball.velocity.y) / ball.velocity.x) *
                    (ball.velocity.y < 0 ? -1 : 1);
                  ball.velocity.x = -ball.velocity.x * a;
                  ball.velocity.y = ball.velocity.y * c;
                  ball.rotation = ball.velocity.y * 0.015;
                }
              } else {
                if (D < ball.radius) {
                  var F = ball.velocity.x,
                    E = ball.velocity.y,
                    B,
                    z;
                  w = (ball.radius - D) / Math.sqrt(F * F + E * E);
                  ball.x -= Math.round(F * w);
                  ball.y -= Math.round(E * w * (E < 0 ? -1 : 1));
                  B = (G[P].dx < 0 && F > 0) || (G[P].dx > 0 && F < 0) ? 1 : -1;
                  z = (G[P].dy < 0 && E > 0) || (G[P].dy > 0 && E < 0) ? 1 : -1;
                  ball.velocity.x =
                    B == -1 && z == -1 ? E * a * -G[P].dx : F * B;
                  ball.velocity.y =
                    B == -1 && z == -1 ? F * a * -G[P].dy : E * a * z;
                  ball.rotation =
                    ball.velocity.x * 0.015 + ball.velocity.y * 0.015;
                }
              }
            }
          }
        }
      }
    };

    var f = function () {
      var z, w, y, x;
      if (!ball.dragging) {
        ball.velocity.y += b;
        if (Math.abs(ball.velocity.x) < 1) {
          ball.velocity.x = 0;
        }
        if (Math.abs(ball.velocity.y) < 1) {
          ball.velocity.y = 0;
        }
        ball.x = ball.x + Math.round(ball.velocity.x);
        ball.y = ball.y + Math.round(ball.velocity.y);
        t();
      }
      for (var v = 0, u = e.list.length; v < u; v++) {
        z = e.list[v].ref;
        w = e.list[v].context;
        y = ball.x - (z.screenX - o.x0);
        x = ball.y - (z.screenY - o.y0);
        w.save();
        w.clearRect(0, 0, z.innerWidth, z.innerHeight);
        w.translate(y, x);
        ball.angle += ball.rotation;
        w.rotate(ball.angle);
        w.drawImage(ball.img, -ball.offset.x, -ball.offset.y, ball.w, ball.h);
        w.restore();
      }
    };

    var k = function () {
      var v = e.list
        .map(function (w) {
          return w.ref;
        })
        .splice(1);
      for (let i = 0, len = v.length; i < len; i++) {
        v[i].close();
      }
      self.removeEventListener("resize", n, false);
      self.removeEventListener("mousedown", h.down, false);
      self.removeEventListener("mouseup", h.up, false);
      ball.img = null;
    };

    return {
      init: function () {
        var u = document.getElementById
          ? document.getElementById("stage")
          : null;
        if (!u || !u.getContext) {
          return;
        }
        u.width = window.innerWidth;
        u.height = window.innerHeight;
        window.addEventListener("resize", n, false);
        window.addEventListener("mousedown", h.down, false);
        window.addEventListener("mouseup", h.up, false);
        window.onunload = k;
        var v = document.createElement("a");
        v.appendChild(document.createTextNode("Create Window"));
        v.className = "child";
        document.body.appendChild(v);
        v.addEventListener("click", g, false);
        v = document.createElement("a");
        v.appendChild(document.createTextNode("Reset Ball"));
        v.className = "reset";
        document.body.appendChild(v);
        v.addEventListener("click", m, false);
        v = null;
        if (window.screenX === undefined) {
          window.screenX = window.screenLeft;
          window.screenY = window.screenTop;
          q = true;
        }
        e.add(self);
        ball.w *= ball.scale;
        ball.h *= ball.scale;
        ball.offset.x = ball.radius = ball.w / 2;
        ball.offset.y = ball.h / 2;
        ball.x = window.innerWidth / 2;
        ball.y = window.innerHeight / 2;
        ball.img.onload = function () {
          setInterval(f, s);
        };
        ball.img.src = ballImage;
        setInterval(r, 250);
        v = null;
      },

      addChild: function (v) {
        var u = v.document.getElementById("stage");
        u.width = v.innerWidth;
        u.height = v.innerHeight;
        v.addEventListener("resize", n, false);
        v.addEventListener("mousedown", h.down, false);
        v.addEventListener("mouseup", h.up, false);
        v.onunload = this.removeChild;
        if (q) {
          v.screenX = v.screenLeft;
          v.screenY = v.screenTop;
        }
        e.add(v);
        v = null;
      },

      removeChild: function () {
        var u = this.quad_ref,
          v = e.remove(u);
        v.removeEventListener("resize", n, false);
        v.removeEventListener("mousedown", h.down, false);
        v.removeEventListener("mouseup", h.up, false);
        u = v = null;
      },
    };
  })();
}

// @ts-expect-error
window.browserball = browserball;
browserball.init();
