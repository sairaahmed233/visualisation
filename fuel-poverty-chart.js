// Load data
d3.csv("fuel-poverty.csv").then((data) => {
  // Process data
  const dataByRegion = d3
    .rollups(
      data,
      (v) =>
        v.map((d) => ({
          year: parseInt(d["Year"]),
          value: parseFloat(d["Proportion of households fuel poor (%)"]),
          inGroupValue: parseFloat(
            d["Proportion of households fuel poor within region (%)"]
          ),
        })),
      (d) => d["Region"]
    )
    .map(([region, values]) => ({ region, values }));
  console.log("dataByRegion", dataByRegion);

  let regions = dataByRegion.map((d) => d.region);
  let years = dataByRegion[0].values.map((d) => d.year);

  let selectedRegions = new Set(regions);

  // Set up dimensions
  let container = d3.select("#fuel-poverty-chart");
  let margin = {
    top: 32,
    right: 24,
    bottom: 24,
    left: 40,
  };
  let width = container.node().clientWidth;
  let height = 400;
  let dotRadius = 5;
  let lineStrokeWidth = 1.5;

  // Set up color
  let focusLineStroke = "#000";

  // Set up formatter
  let formatPercentage = (d) => `${d}%`;

  // Set up scales
  let xScale = d3
    .scaleLinear()
    .domain(d3.extent(years))
    .range([margin.left, width - margin.right]);

  let minValue = d3.min(dataByRegion, (d) => d3.min(d.values, (e) => e.value));
  let maxValue = d3.max(dataByRegion, (d) => d3.max(d.values, (e) => e.value));
  let yScale = d3
    .scaleLinear()
    .domain([minValue, maxValue])
    .range([height - margin.bottom, margin.top])
    .nice();

  let colorScale = d3.scaleOrdinal().domain(regions).range(d3.schemeTableau10);

  // Set up line path
  let line = d3
    .line()
    .x((d) => xScale(d.year))
    .y((d) => yScale(d.value));

  // Draw title
  container
    .append("div")
    .attr("class", "title")
    .text("Fuel poor households regional trends");

  // Draw chart
  const chart = container.append("div").attr("class", "chart-container");
  const svg = chart
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .on("mouseenter", mouseEntered)
    .on("mousemove", mouseMoved)
    .on("mouseleave", mouseLeft);

  // Draw tooltip
  const tooltip = chart
    .append("div")
    .attr("class", "tooltip")
    .style("display", "none");

  // Draw x axis
  const xAxisG = svg
    .append("g")
    .attr("class", "x axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(
      d3
        .axisBottom(xScale)
        .ticks(10)
        .tickFormat((d) => d)
    );

  // Draw y axis
  const yAxisG = svg
    .append("g")
    .attr("class", "y axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(yScale).ticks(5).tickFormat(formatPercentage));
  yAxisG.select(".domain").remove();

  // Draw y axis title
  svg
    .append("text")
    .attr("class", "axis-title")
    .attr("fill", "currentColor")
    .attr("y", 16)
    .text("Proportion of households fuel poor");

  // Render focus line
  let focusLine = svg
    .append("line")
    .attr("class", "focus-line")
    .attr("y1", margin.top)
    .attr("y2", height - margin.bottom)
    .attr("stroke", focusLineStroke)
    .attr("stroke-dasharray", 4)
    .attr("display", "none");

  // Draw region groups
  let regionG = svg
    .append("g")
    .attr("class", "regions")
    .selectAll("g")
    .data(dataByRegion)
    .join("g")
    .attr("class", "region")
    .style("color", (d) => colorScale(d.region));

  // Draw region path
  let regionPath = regionG
    .append("path")
    .attr("class", "region-path")
    .attr("fill", "none")
    .attr("stroke", "currentColor")
    .attr("stroke-width", lineStrokeWidth)
    .attr("d", (d) => line(d.values));

  let regionCircle = regionG
    .selectAll("circle")
    .data((d) => d.values)
    .join("circle")
    .attr("class", "region-circle")
    .attr("r", dotRadius)
    .attr("fill", "currentColor")
    .attr("cx", (d) => xScale(d.year))
    .attr("cy", (d) => yScale(d.value));

  // Draw legend
  let legend = container.append("div").attr("class", "legend");

  // Draw legend title
  legend
    .append("div")
    .attr("class", "legend-title")
    .text("Regions (Click to toggle)");

  // Draw legend items
  let legendItem = legend
    .append("div")
    .attr("class", "legend-items")
    .selectAll("div")
    .data(regions)
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

  // Event listener for mouse entering svg
  function mouseEntered() {
    tooltip.style("display", "block");

    focusLine.attr("display", "block");
  }

  // Event listener for mouse moving inside svg
  function mouseMoved(event) {
    // Find the mouse x position
    let [xm, ym] = d3.pointer(event, chart.node());
    // Convert x position from pixel values to year values
    let xYear = xScale.invert(xm);
    // Find the nearest year index that's close to x position year value
    let xIndex = d3.bisectCenter(years, xYear);

    updateTooltipContent(xIndex);
    tooltip
      .style("left", xScale(years[xIndex]) + dotRadius + "px")
      .style("top", ym + "px");

    // Update focus line
    focusLine.attr("transform", `translate(${xScale(years[xIndex])},0)`);

    // Update region circle
    regionCircle.attr("stroke", (d) =>
      d.year === years[xIndex] ? "#000" : null
    );
  }

  // Event listener for mouse leaving svg
  function mouseLeft() {
    tooltip.style("display", "none");

    focusLine.attr("display", "none");

    regionCircle.attr("stroke", null);
  }

  // Event listener for clicking a legend item
  function clicked(event, d) {
    if (selectedRegions.has(d)) {
      // If the item is already selected, delete it
      selectedRegions.delete(d);
      // If no item selected, select all items
      if (selectedRegions.size === 0) {
        selectedRegions = new Set(regions);
      }
    } else {
      // If the item isn't selected, add it
      selectedRegions.add(d);
    }
    updateChart();
    updateLegend();
  }

  function updateTooltipContent(xIndex) {
    // Remove old tooltip content
    tooltip.selectAll("*").remove();

    // Add year
    const year = years[xIndex];
    tooltip.append("div").text(year);

    // Add region value breakdown
    let tr = tooltip
      .append("table")
      .append("tbody")
      .selectAll("tr")
      .data(dataByRegion.filter((d) => selectedRegions.has(d.region)))
      .join("tr");

    let item = tr.append("td").append("div").attr("class", "legend-item");

    item
      .append("div")
      .attr("class", "legend-swatch")
      .style("color", (d) => colorScale(d.region));

    item
      .append("div")
      .attr("class", "legend-label")
      .text((d) => d.region);

    tr.append("td")
      .attr("class", "value-td")
      .text((d) => formatPercentage(d.values[xIndex].value));
  }

  function updateChart() {
    // Adjust y scale domain according to selected regions
    let selectedDataByRegion = dataByRegion.filter((d) =>
      selectedRegions.has(d.region)
    );

    let minValue = d3.min(selectedDataByRegion, (d) =>
      d3.min(d.values, (e) => e.value)
    );
    let maxValue = d3.max(selectedDataByRegion, (d) =>
      d3.max(d.values, (e) => e.value)
    );
    yScale.domain([minValue, maxValue]).nice();

    // Update y axis
    yAxisG.call(d3.axisLeft(yScale).ticks(5).tickFormat(formatPercentage));
    yAxisG.select(".domain").remove();

    // Update region groups
    regionG.attr("display", (d) =>
      selectedRegions.has(d.region) ? "block" : "none"
    );

    // Update region path
    regionPath.attr("d", (d) => line(d.values));

    // Update region circles
    regionCircle
      .attr("cx", (d) => xScale(d.year))
      .attr("cy", (d) => yScale(d.value));
  }

  function updateLegend() {
    legendItem.classed(
      "muted",
      (d) => selectedRegions.size && !selectedRegions.has(d)
    );
  }
});
