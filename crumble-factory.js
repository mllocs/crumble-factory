(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['raphael'], function (b) {
      return (root.CrumbleFactory = factory(b));
    });
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like enviroments that support module.exports,
    // like Node.
    module.exports = factory(require('raphael'));
  } else {
    // Browser globals
    root.CrumbleFactory = factory(root.Raphael);
  }
}(this, function (Raphael) {
  var CrumbleFactory, Helpers;

  /**
   * Point Constructor
   * represents a couple of x and y values
   *
   * @param {Number} x
   * @param {Number} y
   */
  function Point(x, y) {
    this.x = x;
    this.y = y;
  }

  /**
   * Transposes the point
   *
   * @param  {Number} dx
   * @param  {Number} dy (optional)
   * @return {Point}
   */
  Point.prototype.transpose = function (dx, dy) {
    if (dy === undefined) {
      dy = dx;
    }

    this.x += dx;
    this.y += dy;
    return this;
  };

  /**
   * Shrinks the point position
   *
   * @param  {Number} tx
   * @param  {Number} ty (optional)
   * @return {Point}
   */
  Point.prototype.shrink = function (tx, ty) {
    if (ty === undefined) {
      ty = tx;
    }

    this.x *= tx;
    this.y *= ty;
    return this;
  };

  /**
   * Converts a point into a string
   *
   * @return {String}
   */
  Point.prototype.toString = function () {
    return this.x + ',' + this.y;
  };

  /**
   * Helper functions
   */
  Helpers = {};

  /**
   * Throws error if bool is false
   *
   * @param  {Boolean} bool
   * @param  {String} message
   */
  Helpers.assert = function (bool, message) {
    if (!bool) {
      throw new Error(message || 'The passed options are incorrect');
    }
  };

  /**
   * Draws a line in the paper
   *
   * @param  {Paper} paper
   * @param  {Point} point0
   * @param  {Point} point1
   * @return {Object} Raphael object
   */
  Helpers.svgLine = function (paper, point0, point1) {
    return paper.path(['M', point0.x, ' ', point0.y, 'L', point1.x, ' ', point1.y].join(''));
  };

  /**
   * Draws the circle representing a value
   *
   * @param  {Paper} paper
   * @param  {Point} point
   * @param  {String} color
   * @param  {Object} metadata
   */
  Helpers.drawCircle = function (paper, point, color, metadata) {
    var inner_circle
      , outer_circle;

    inner_circle = paper
      .circle(point.x, point.y, 4)
      .attr({
        'fill': '#fff'
      , 'stroke-width': 3
      , 'stroke': color
      })
      .hover(
        function () {
          this.attr({'fill': color});
        }
      , function () {
          this.attr({'fill': '#fff'});
        }
      );

    outer_circle = paper.circle(point.x, point.y, 6).attr({
      'stroke': '#fff'
    , 'stroke-width': 2
    });

    if (metadata.shades) {
      outer_circle.attr({
        'stroke-opacity': 0
      });
    }

    return [inner_circle, outer_circle];
  };

  /**
   * Draws the line between two dots
   *
   * @param  {Paper} paper
   * @param  {Point} point0
   * @param  {Point} point
   * @param  {String} color
   */
  Helpers.drawLine = function (paper, point0, point, color) {
    if (point0 !== undefined) {
      Helpers.svgLine(paper, point0, point).attr({
        'stroke-width': 4
      , 'stroke': color
      });
    }
  };

  /**
   * Sets custom data values to the given node
   *
   * @param {Element} element
   * @param {*} value
   */
  Helpers.setUserValues = function (element, value) {
    element.node.setAttribute('data-point', 1);
    element.node.setAttribute('data-point-y', value);
  };

  /**
   * Draws the values in the paper
   *
   * @param  {Paper} paper
   * @param  {Array<Number>} values
   * @param  {String} color
   * @param  {Object} metadata
   */
  Helpers.drawValues = function (paper, values, color, metadata) {
    var point, last_point, i, dx, dy, value, range_values, circles
      , points_array = []
      , padding = metadata.padding || 0
      , shrinkx = (metadata.width  - (padding * 2)) / metadata.width
      , shrinky = (metadata.height - (padding * 2)) / metadata.height;

    range_values = metadata.top_value - metadata.bottom_value;
    dx = metadata.width / (values.length - 1);
    dy = metadata.height / range_values;

    for (i = 0; i < values.length; i++) {
      value = values[i] || 0;

      point = new Point(0 + (i * dx), metadata.height - value * dy);
      point.shrink(shrinkx, shrinky).transpose(padding);

      if (color) {
        Helpers.drawLine(paper, last_point, point, color);

        if (circles) {
          circles[0].toFront();
          circles[1].toFront();
        }

        circles = Helpers.drawCircle(paper, point, color, metadata);
        Helpers.setUserValues(circles[0], value);
      }

      last_point = point;
      points_array.push(point);
    }

    return points_array;
  };

  /**
   * Draws a polygon shade
   *
   * @param  {Paper} paper
   * @param  {Array<Point>} points
   * @param  {String} color
   */
  Helpers.drawShades = function (paper, points, color) {
    var points_string = ''
      , i;

    for (i = 0; i < points.length; i++) {
      points_string += points[i].toString() + ' ';
    }

    paper.path('M' + points_string + 'Z').attr({
      'fill': color
    , 'fill-opacity': '0.2'
    , 'stroke-width': 0
    }).toBack();
  };

  /**
   * Draws the horizontal division lines
   *
   * @param  {Paper} paper
   * @param  {Object} metadata
   */
  Helpers.drawHorizontalLines = function (paper, metadata) {
    var padding = metadata.padding || 0
      , shrinky = (metadata.height - (padding * 2)) / metadata.height
      , top = metadata.top_value
      , bottom = metadata.bottom_value
      , range_values = top - bottom
      , segments = metadata.segments || 3
      , delta = range_values / segments
      , dy = metadata.height / range_values
      , i, p0, p1, height, value, chrome_bug;

    for (i = 0; i < segments; i++) {
      value = range_values / (segments - 1) * i;
      height = metadata.height - value * dy;

      p0 = new Point(0, height);
      p1 = new Point(metadata.width, height);

      p0.shrink(1, shrinky).transpose(0, padding);
      p1.shrink(1, shrinky).transpose(0, padding);

      Helpers.svgLine(paper, p0, p1).attr({'stroke': '#ccc'}).toBack();
      chrome_bug = paper.text(p0.x + metadata.padding / 4, p0.y - 6, value.toFixed(0)).attr({
        'font-size': 12
      , 'font-weight': 'bold'
      , 'fill': '#bbb'
      });

      try {
        if (chrome_bug.node.childNodes[0].attributes[0].name === 'dy') {
          chrome_bug.node.childNodes[0].attributes[0].value = 0;
        }
      } catch (err) {}
    }
  };

  /**
   * Preprocess the input options and builds the metadata object
   *
   * @param  {Object} options
   * @return {Object} metadata
   */
  Helpers.buildMetadata = function (options) {
    var i, j
      , valuesy = options.valuesy
      , values
      , max = valuesy[0][0]
      , min = valuesy[0][0]
      , value;

    if (options.top_value === undefined || options.bottom_value === undefined) {
      for (i = 0; i < valuesy.length; i++) {
        values = valuesy[i];

        for (j = 0; j < values.length; j++) {
          value = values[j];

          if (value > max) {
            max = value;
          }

          if (value < min) {
            min = value;
          }
        }
      }
    }

    if (options.top_value !== undefined) {
      max = options.top_value;
    } else if (max % 2 && !options.segments) {
      max += 1;
    }

    if (options.bottom_value !== undefined) {
      min = options.bottom_value;
    }

    if (min === max) {
      max += 10;
    }

    return {
      top_value: max
    , bottom_value: min
    , width: options.width
    , height: options.height
    , padding: options.padding
    , colors: options.colors
    , segments: options.segments
    , shades: options.shades
    };
  };

  /**
   * Validates the input options
   *
   * @param  {Object} options
   */
  Helpers.validateOptions = function (options) {
    var i, values_length;

    Helpers.assert(options.width);
    Helpers.assert(options.height);
    Helpers.assert(options.container);
    Helpers.assert(options.valuesy);

    if (options.colors) {
      Helpers.assert(options.colors.length === options.valuesy.length);
    }

    values_length = options.valuesy[0].length;

    for (i = 0; i < options.valuesy.length; i++) {
      Helpers.assert(options.valuesy[i].length === values_length);
    }
  };

  /**
   * Exported methods
   */
  CrumbleFactory = {};

  /**
   * Creates a Cronut
   *
   * @param  {Object} options
   */
  CrumbleFactory.create = function (options) {
    Helpers.validateOptions(options);

    var valuesy = options.valuesy
      , i, paper, metadata, points, points_last;

    paper = new Raphael(
      options.container
    , options.width
    , options.height
    );

    metadata = Helpers.buildMetadata(options);

    for (i = 0; i < valuesy.length; i++) {
      points = Helpers.drawValues(
        paper
      , valuesy[i]
      , options.colors ? options.colors[i] : 'black'
      , metadata
      );

      if (options.shades) {
        if (points_last) {
          Helpers.drawShades(
            paper
          , points_last.concat(points.slice(0).reverse())
          , options.shade_colors ? options.shade_colors[i - 1] : 'red'
          );
        }

        points_last = points.slice(0); // Clone
      }
    }

    if (options.shades) {
      points = Helpers.drawValues(paper, new Array(points_last.length), null, metadata);
      Helpers.drawShades(
        paper
      , points_last.concat(points.slice(0).reverse())
      , options.shade_colors ? options.shade_colors[valuesy.length - 1] : 'red'
      );
    }

    Helpers.drawHorizontalLines(paper, metadata);
  };

  return CrumbleFactory;
}));
