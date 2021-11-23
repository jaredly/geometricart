export const shaderFunctions = (numSegs: number) => `

const float Infinity = intBitsToFloat(0x7F800000);

struct Segment
{
	bool isArc;
	vec2 limit;
	// either center or slope / intercept
	vec2 centerSI;
	float radius;
};

struct Intersections {
	int count;
	vec2[2] coords;
};

const float epsilon = 0.00001;
const float PI = ${Math.PI.toFixed(10)};

bool closeEnough(float one, float two) {
	return abs(one - two) < epsilon;
}

bool isOnLine(vec2 coord, vec2 slopeIntercept) {
	if (isinf(slopeIntercept.x)) {
		return closeEnough(slopeIntercept.y, coord.x);
	}
	return closeEnough(slopeIntercept.x * coord.x + slopeIntercept.y, coord.y);
}

bool withinLimit(vec2 limit, float value) {
	return limit.x - epsilon <= value && value <= limit.y + epsilon;
}

bool isWithinLineLimit(vec2 coord, Segment seg) {
	if (isinf(seg.centerSI.x)) {
		return withinLimit(seg.limit, coord.y);
	}
	return withinLimit(seg.limit, coord.x);
}

float angleTo(vec2 one, vec2 two) {
	vec2 diff = two - one;
	return atan(diff.y, diff.x);
}

float dist(vec2 one, vec2 two) {
	return length(one - two);
}

bool isOnCircle(vec2 coord, Segment seg) {
	if (closeEnough(coord.x, seg.centerSI.x)) {
		return closeEnough(coord.y, seg.centerSI.y + seg.radius) ||
            closeEnough(coord.y, seg.centerSI.y - seg.radius);
	}
    if (closeEnough(coord.y, seg.centerSI.y)) {
        if (
            closeEnough(coord.x, seg.centerSI.x + seg.radius) ||
            closeEnough(coord.x, seg.centerSI.x - seg.radius)
        ) {
            return true;
        }
        return false;
    }
    float d = dist(coord, seg.centerSI);
    return closeEnough(d, seg.radius);
}

// left & right are assumed to be between -PI and PI
// The result will always be positive, and between 0 and 2PI
float angleBetween(
    float left,
    float right,
    bool clockwise
) {
    if (!clockwise) {
		float mid = left;
		left = right;
		right = mid;
    }
    if (closeEnough(left, right)) {
        return 0.0;
    }
    if (right >= left) {
        return right - left;
    }
    return right + PI * 2.0 - left;
}

// true if middle is between left and right, going from left to right around the circle {clockwise/or not}
// if middle is equal to left or right, also return true
bool isAngleBetween(
    float left,
    float middle,
    float right,
	bool clockwise
) {
    if (closeEnough(left, right)) {
        return true;
    }
    if (closeEnough(middle, right)) {
        return true;
    }
    float lm = angleBetween(left, middle, clockwise);
    float lr = angleBetween(left, right, clockwise);
    return lm <= lr;
}

Intersections lineLine(Segment one, Segment two) {
	Intersections result;
	if (one.centerSI.x == two.centerSI.x) {
		return result;
	}

	if (isinf(one.centerSI.x)) {
		float y = two.centerSI.x * one.centerSI.y + two.centerSI.y;
		if (!withinLimit(one.limit, y)) {
			return result;
		}
		if (!withinLimit(two.limit, one.centerSI.y)) {
			return result;
		}
		result.count = 1;
		result.coords[0] = vec2(one.centerSI.y, y);
	}

	if (isinf(two.centerSI.x)) {
		float y = one.centerSI.x * two.centerSI.y + one.centerSI.y;
		if (!withinLimit(two.limit, y)) {
			return result;
		}
		if (!withinLimit(one.limit, two.centerSI.y)) {
			return result;
		}
		result.count = 1;
		result.coords[0] = vec2(two.centerSI.y, y);
	}

	if (closeEnough(one.centerSI.x, two.centerSI.y)) {
		return result;
	}

	float x = (two.centerSI.y - one.centerSI.y) / (one.centerSI.x - two.centerSI.x);
	if (!withinLimit(one.limit, x)) {
		return result;
	}
	if (!withinLimit(two.limit, x)) {
		return result;
	}
	result.count = 1;
	result.coords[0] = vec2(x, one.centerSI.x * x + one.centerSI.y);
}

Intersections findIntersections(Segment one, Segment two) {
	if (one.isArc || two.isArc) {
		Intersections result;
		return result;
	}
	return lineLine(one, two);
}



// "bottom" here being the visual bottom, so the /greater/ y value. yup thanks.
bool atLineBottom(vec2 coord, Segment seg){
    if (seg.centerSI.x == Infinity) {
        return closeEnough(coord.y, seg.limit.y);
    }
    return closeEnough(coord.x, seg.centerSI.x > 0.0 ? seg.limit.y : seg.limit.x);
}


vec2 push(vec2 coord, float theta, float amount) {
	return coord + vec2(cos(theta), sin(theta)) * amount;
}

bool coordsEqual(vec2 one, vec2 two) {
	return closeEnough(one.x, two.x) && closeEnough(one.y, two.y);
}

// Also returns true if we're at the top or bottom tangent and not on the top endpoint
bool atCircleBottomOrSomething(vec2 coord, Segment seg) {
    bool atX = closeEnough(coord.x, seg.centerSI.x);

    // If we're at the nadir, always ignore.
    if (atX && coord.y > seg.centerSI.y) {
        return true;
    }

    if (atX) {
        // if we're at the summit, ignore only if we're not also at an endpoint
        return !(
            closeEnough(seg.limit.x, -PI / 2.0) ||
            closeEnough(seg.limit.y, -PI / 2.0)
        );
    }

    // Ok, given that we're not at the top or bottom

    // if limit.x is /less/ than PI away from the summit, limit.x is a "bottom" point
    // if limit.y is /less/ than PI past the summit, it is a "bottom" point
    if (
        angleBetween(seg.limit.x, -PI / 2.0, true) < PI &&
        coordsEqual(push(seg.centerSI, seg.radius, seg.limit.x), coord)
    ) {
        return true;
    }

    if (
        angleBetween(-PI / 2.0, seg.limit.y, true) < PI &&
        coordsEqual(push(seg.centerSI, seg.radius, seg.limit.y), coord)
    ) {
        return true;
    }

    return false;
}





bool isInsidePath(vec2 coord, Segment[${numSegs}] segments, int count) {
	Segment ray = Segment(false, vec2(coord.x, Infinity), vec2(0.0, coord.y), 0.0);

	int allHits = 0;

	for (int i=0; i<count; i++) {
		Segment seg = segments[i];
		if (seg.isArc) {
			if (isOnLine(coord, seg.centerSI)) {
				if (isWithinLineLimit(coord, seg)) {
					return false;
				}
			}
		} else {
			if (isOnCircle(coord, seg)) {
				if (isAngleBetween(seg.limit.x, angleTo(seg.centerSI, coord), seg.limit.y, true)) {
					return false;
				}
			}
		}

		Intersections hits = findIntersections(seg, ray);
		for (int j=0; j<hits.count; j++) {
			vec2 coord = hits.coords[j];
			if (seg.isArc) {
				if (atCircleBottomOrSomething(coord, seg)) {
					continue;
				}
			} else {
				if (atLineBottom(coord, seg)) {
					continue; 
				}
			}
			allHits += 1;
		}
	}

	return allHits % 2 == 1;
}

`;
