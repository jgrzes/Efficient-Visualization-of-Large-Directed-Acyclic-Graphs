(function () {
  var data = window.__GRAPH_DATA__ || {};
  var container = document.getElementById("graph");
  var tooltip = document.getElementById("tooltip");
  var countEl = document.getElementById("counts");
  var fitBtn = document.getElementById("fit-view");
  var pointSizeInput = document.getElementById("point-size");
  var pointSizeValue = document.getElementById("point-size-value");
  var themeRow = document.getElementById("theme-row");
  var nodeInfoPanel = document.getElementById("node-info");
  var nodeInfoTitle = document.getElementById("node-info-title");
  var nodeInfoBody = document.getElementById("node-info-body");
  var nodeInfoClose = document.getElementById("node-info-close");

  var positions = data.positions || [];
  var links = data.links || [];
  var properties = data.properties || [];

  if (!container || positions.length === 0) {
    if (container) {
      container.innerHTML = '<div class="empty-state">This graph has no nodes to display.</div>';
    }
    return;
  }

  var pointCount = positions.length / 2;
  var linkCount = links.length / 2;

  if (countEl) {
    countEl.textContent = pointCount.toLocaleString() + " nodes · " + linkCount.toLocaleString() + " edges";
  }

  function nodeName(index) {
    var props = properties[index];
    return (props && props.name) || "Node " + index;
  }

  function showNodeInfo(index) {
    if (!nodeInfoPanel) return;
    var props = properties[index] || {};

    if (nodeInfoTitle) nodeInfoTitle.textContent = nodeName(index);

    if (nodeInfoBody) {
      nodeInfoBody.innerHTML = "";
      var keys = Object.keys(props).filter(function (key) {
        return key !== "name";
      });

      keys.forEach(function (key) {
        var value = props[key];
        if (value === null || value === undefined || value === "") return;

        var row = document.createElement("div");
        row.className = "prop-row";

        var k = document.createElement("div");
        k.className = "prop-key";
        k.textContent = key;

        var v = document.createElement("div");
        v.className = "prop-value";
        v.textContent = typeof value === "string" ? value : JSON.stringify(value);

        row.appendChild(k);
        row.appendChild(v);
        nodeInfoBody.appendChild(row);
      });

      if (!nodeInfoBody.children.length) {
        var empty = document.createElement("div");
        empty.className = "prop-value";
        empty.style.opacity = "0.6";
        empty.textContent = "No additional properties.";
        nodeInfoBody.appendChild(empty);
      }
    }

    nodeInfoPanel.hidden = false;
  }

  function hideNodeInfo() {
    if (nodeInfoPanel) nodeInfoPanel.hidden = true;
  }

  var graph = new Cosmos.Graph(container, {
    backgroundColor: data.background || "#0b0b0f",
    pointColor: data.pointColor || "#6B7280",
    linkColor: data.linkColor || "#9CA3AF",
    pointSize: data.pointSize || 4,
    linkWidth: 1,
    linkArrows: false,
    enableSimulation: false,
    enableDrag: false,
    fitViewOnInit: true,
    fitViewDelay: 200,
    fitViewPadding: 0.15,
    onClick: function (index) {
      if (index === undefined || index === null) {
        hideNodeInfo();
      } else {
        showNodeInfo(index);
      }
    },
    onPointMouseOver: function (index) {
      if (tooltip) {
        tooltip.textContent = nodeName(index);
        tooltip.style.display = "block";
      }
    },
    onPointMouseOut: function () {
      if (tooltip) tooltip.style.display = "none";
    },
  });

  graph.setPointPositions(new Float32Array(positions));
  graph.setLinks(new Float32Array(links));
  graph.render();
  // Belt-and-suspenders: don't rely solely on the library's internal
  // fitViewOnInit timer, which can race with layout/paint on first load.
  graph.fitView(0, 0.15);

  document.addEventListener("mousemove", function (e) {
    if (tooltip && tooltip.style.display === "block") {
      tooltip.style.left = e.clientX + 14 + "px";
      tooltip.style.top = e.clientY + 14 + "px";
    }
  });

  if (fitBtn) {
    fitBtn.addEventListener("click", function () {
      graph.fitView();
    });
  }

  if (nodeInfoClose) {
    nodeInfoClose.addEventListener("click", hideNodeInfo);
  }

  if (pointSizeInput) {
    var initialSize = data.pointSize || 4;
    pointSizeInput.value = String(initialSize);
    if (pointSizeValue) pointSizeValue.textContent = String(initialSize);

    pointSizeInput.addEventListener("input", function () {
      var value = parseFloat(pointSizeInput.value);
      if (pointSizeValue) pointSizeValue.textContent = pointSizeInput.value;
      graph.setConfig({ pointSize: value });
      graph.render();
    });
  }

  if (themeRow) {
    var themeButtons = themeRow.querySelectorAll("button");
    themeButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var theme = btn.getAttribute("data-theme-option");
        var bg = theme === "light" ? "#ffffff" : "#0b0b0f";
        document.documentElement.setAttribute("data-theme", theme);
        graph.setConfig({ backgroundColor: bg });
        graph.render();
        themeButtons.forEach(function (b) {
          b.classList.toggle("active", b === btn);
        });
      });
    });
  }
})();
