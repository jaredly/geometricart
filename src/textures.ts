// Many thanks to folks

// based on https://www.shadertoy.com/view/wsdyRf
export const texture1 = () => {
    const cell = 15;
    return `#version 300 es

precision mediump float;

out vec4 fragColor;
uniform float u_time;
uniform vec2 u_resolution;

vec2 noise(vec2 x)
{
    return fract(cos(dot(x,vec2(134.,1.61034)))*vec2(416418.0,1265.7486));
}

vec4 mainImage(in vec2 fragCoord )
{
    vec2 uv = fragCoord.xy/${cell.toFixed(1)};
    vec2 uv00 = vec2(0,0)+floor(uv);
    vec2 uv01 = vec2(0,1)+floor(uv);
    vec2 uv10 = vec2(1,0)+floor(uv);
    vec2 uv11 = vec2(1,1)+floor(uv);

    vec3 col = vec3(0);
    vec2 n00 = noise(uv00);
    vec2 n01 = noise(uv01);
    vec2 n10 = noise(uv10);
    vec2 n11 = noise(uv11);
    uv00 = ceil(uv00) + n00-.5;
    uv01 = ceil(uv01) + n01-.5;
    uv10 = ceil(uv10) + n10-.5;
    uv11 = ceil(uv11) + n11-.5;

    vec2 uv0 = mix(uv00,uv01, float(distance(uv00,uv)>distance(uv01,uv)));
    vec2 uv1 = mix(uv10,uv11, float(distance(uv10,uv)>distance(uv11,uv)));
    vec2 uvC = mix(uv0,uv1,   float(distance(uv0,uv) >distance(uv1,uv)));
    vec2 uvL = uv-uvC;
    vec2 vn = noise(uvC)-.5;
    float g = dot(uvL,normalize(vn));
    // float s = dot(fragCoord.xy/CELL,vn);
    float size = 0.5;
    float so = .4+1./(16.+size);
	float amt = clamp(smoothstep(-so, so, sin((6.+size*12.)*g)), 0.0, 1.0);
    col = vec3((amt));
    return vec4(col / 6.0, 0.1);
}

void main() {
	fragColor = mainImage(gl_FragCoord.xy);
}`;
};

// cross hatchy
// based on https://www.shadertoy.com/view/MsSGD1
export const texture2 = () => {
    return `#version 300 es

precision mediump float;

out vec4 fragColor;
uniform float u_time;
uniform vec2 u_resolution;

float rand(float x)
{
    return fract(sin(x) * 43758.5453);
}

float triangle(float x)
{
	return abs(1.0 - mod(abs(x), 2.0)) * 2.0 - 1.0;
}


vec4 getPixel(vec2 p)
{
    float diffuse = 0.5;
    vec3 c;
	
	float xs = 1.;
	float ys = 1.;
    float off = 11.0;
    float amt = 10.;//sin(iTime * 3.0) * 3.0;
    
    // [300, 200] was great, diagonal
    // [0, 350] was solid vertical
	float a1 = 0., a2 = 350.;
	// float a1 = 300., a2 = 200.;
    // float a1 = 0.; // 170. + sin(iTime * 4.) * 40.;
    // float a2 = 350.;//100. + sin(iTime * 4.) * 40.0 * 0.;
    float up = 0.8; //  + sin(iTime * 2.) * 0.5;
	float hatching = clamp(max(
      (sin(
        p.x * xs * (a1 ) +
        p.y * ys * (a2 )
       ) * 0.5 + up) ,
      (sin(
        p.x * xs * (-a2 ) +
		p.y * ys * (a1 )
       )* 0.5 + up)), 0., 1.);
	
	vec4 mCol = mix(vec4(0.0), vec4(0.3), hatching);
    mCol.w = 0.5 - mCol.x;
	mCol.xyz = vec3(0., 0., 0.);
	return mCol;
}

void main()
{	
	// pixel position
	vec2 q = gl_FragCoord.xy / u_resolution.xy;
	vec2 p = -1.0+2.0*q;
	p.x *= -u_resolution.x/u_resolution.y;
    
    float wave = 1.0;//sin(iTime * 5.0) * 2.5;
    
    float off = 1.0;
	p += vec2(triangle(p.y * rand(off) * 4.0),
			  triangle(p.x * rand(off * 3.4) * 4.0)) * 0.015 * wave;
	p += vec2(rand(p.x * 3.1 + p.y * 8.7),
			  rand(p.x * 1.1 + p.y * 6.7)) * 0.01;
	
	fragColor = getPixel(p);

	// For testing:
	// if (gl_FragCoord.x < 100.0) {
	// 	discard;
	// }
}
	`;
};
