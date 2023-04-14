// Load data
d3.csv("data/cost-of-living.csv").then((data) => {
  // Process data
  let question = data.columns[0];
  let ageGroups = ["18-24", "25-34", "35-49", "50-64", "65+"];
  let answers = data.map((d) => d[question]);
  let answersByAgeGroup = ageGroups.map((ageGroup) => {
    let values = answers.map((answer) => {
      let value = parseInt(data.find((e) => e[question] === answer)[ageGroup]);
      return {
        answer,
        value,
      };
    });
    return {
      ageGroup,
      values,
    };
  });
  console.log("answersByAgeGroup", answersByAgeGroup);

  let selectedAnswers = new Set(answers);

  // Set up dimensions
  let container = d3.select("#financail-situation-chart");
  let margin = {
    top: 48,
    right: 24,
    bottom: 24,
    left: 128,
  };
  let width = container.node().clientWidth;
  let height = 320;
  let dotRadius = 12;
  let trackStrokeWidth = (dotRadius + 1) * 2;

  // Set up color
  let trackStroke = "#eee";
  let dotLabelFill = "#fff";

  // Set up formatter
  let formatPercentage = (d) => `${d}%`;

  // Set up scales
  let maxValue = d3.max(answersByAgeGroup, (d) =>
    d3.max(d.values, (e) => e.value)
  );
  let xScale = d3
    .scaleLinear()
    .domain([0, maxValue])
    .range([margin.left, width - margin.right])
    .nice();

  let yScale = d3
    .scalePoint()
    .domain(ageGroups)
    .range([margin.top, height - margin.bottom]);

  let colorScale = d3.scaleOrdinal().domain(answers).range(d3.schemeTableau10);

  // Draw title
  container.append("div").attr("class", "title").text(question);

  // Draw chart
  const chart = container.append("div").attr("class", "chart-container");
  const svg = chart.append("svg").attr("width", width).attr("height", height);

  // Draw tooltip
  const tooltip = chart
    .append("div")
    .attr("class", "tooltip")
    .style("display", "none");

  // Draw x axis
  const xAxisG = svg
    .append("g")
    .attr("class", "x axis")
    .attr("transform", `translate(0,24)`)
    .call(d3.axisTop(xScale).ticks(5).tickFormat(formatPercentage));
  xAxisG.select(".domain").remove();

  // Draw y axis
  const yAxisG = svg
    .append("g")
    .attr("class", "y axis group-axis")
    .call(d3.axisRight(yScale).tickSize(0));
  yAxisG.select(".domain").remove();

  // Draw y axis title
  svg
    .append("text")
    .attr("class", "axis-title")
    .attr("fill", "currentColor")
    .attr("y", 24)
    .text("Age Group");

  // Draw row group
  const rowG = svg
    .append("g")
    .attr("class", "rows")
    .selectAll("g")
    .data(answersByAgeGroup)
    .join("g")
    .attr("class", "row")
    .attr("transform", (d) => `translate(0,${yScale(d.ageGroup)})`)
    .on("mouseenter", mouseEntered)
    .on("mousemove", mouseMoved)
    .on("mouseleave", mouseLeft);

  // Draw row track
  rowG
    .append("line")
    .attr("class", "row-track")
    .attr("x1", margin.left)
    .attr("x2", width - margin.right)
    .attr("stroke", trackStroke)
    .attr("stroke-width", trackStrokeWidth)
    .attr("stroke-linecap", "round");

  // Draw dots
  let dot = rowG
    .append("g")
    .attr("class", "dots")
    .selectAll("g")
    .data((d) => d.values)
    .join("g")
    .attr("class", "dot")
    .attr("transform", (d) => `translate(${xScale(d.value)},0)`);

  dot
    .append("circle")
    .attr("class", "dot-circle")
    .attr("r", dotRadius)
    .attr("fill", (d) => colorScale(d.answer));

  dot
    .append("text")
    .attr("class", "dot-label")
    .attr("text-anchor", "middle")
    .attr("fill", dotLabelFill)
    .attr("dy", "0.32em")
    .text((d) => d.value);

  // Draw legend
  let legend = container.append("div").attr("class", "legend");

  // Draw legend title
  legend
    .append("div")
    .attr("class", "legend-title")
    .text("Answers (Click to toggle)");

  // Draw legend items
  let legendItem = legend
    .append("div")
    .attr("class", "legend-items")
    .selectAll("div")
    .data(answers)
    .join("div")
    .attr("class", "legend-item")
    .on("click", clicked);

  legendItem
    .append("div")
    .attr("class", "legend-swatch")
    .style("color", (d) => colorScale(d));

  legendItem
    .append("div")
    .attr("class", "legend-label")
    .text((d) => d);

  // Event listener for mouse entering a row
  function mouseEntered(event, d) {
    updateTooltipContent(d);
    tooltip.style("display", "block");

    d3.select(event.target).selectAll(".dot-circle").attr("stroke", "#000");
  }

  // Event listener for mouse moving in a row
  function mouseMoved(event, d) {
    const [xm] = d3.pointer(event, chart.node());
    tooltip
      .style("left", xm + "px")
      .style("top", yScale(d.ageGroup) + trackStrokeWidth / 2 + "px");
  }

  // Event listener for mouse leaving a row
  function mouseLeft() {
    tooltip.style("display", "none");

    d3.select(event.target).selectAll(".dot-circle").attr("stroke", null);
  }

  // Event listener for clicking a legend item
  function clicked(event, d) {
    if (selectedAnswers.has(d)) {
      // If the item is already selected, delete it
      selectedAnswers.delete(d);
      // If no item selected, select all items
      if (selectedAnswers.size === 0) {
        selectedAnswers = new Set(answers);
      }
    } else {
      // If the item isn't selected, add it
      selectedAnswers.add(d);
    }
    updateChart();
    updateLegend();
  }

  function updateTooltipContent(d) {
    // Remove old tooltip content
    tooltip.selectAll("*").remove();

    // Add age group
    tooltip.append("div").text(`Age Group: ${d.ageGroup}`);

    // Add answer value breakdown
    let tr = tooltip
      .append("table")
      .append("tbody")
      .selectAll("tr")
      .data(d.values.filter((e) => selectedAnswers.has(e.answer)))
      .join("tr");

    let item = tr.append("td").append("div").attr("class", "legend-item");

    item
      .append("div")
      .attr("class", "legend-swatch")
      .style("color", (d) => colorScale(d.answer));

    item
      .append("div")
      .attr("class", "legend-label")
      .text((d) => d.answer);

    tr.append("td")
      .attr("class", "value-td")
      .text((d) => formatPercentage(d.value));
  }

  function updateChart() {
    dot.style("display", (d) =>
      selectedAnswers.has(d.answer) ? "block" : "none"
    );
  }

  function updateLegend() {
    legendItem.classed(
      "muted",
      (d) => selectedAnswers.size && !selectedAnswers.has(d)
    );
  }
});
