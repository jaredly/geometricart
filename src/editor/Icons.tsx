export const transparent =
	`data:image/svg+xml;base64,` +
	btoa(`
            <svg
                width='16'
                height='16'
                xmlns='http://www.w3.org/2000/svg'
            >
			<rect fill='#ccc' x='0' y='0' width='8' height='8' />
			<rect fill='#ccc' x='8' y='8' width='8' height='8' />
			<rect fill='#555' x='0' y='8' width='8' height='8' />
			<rect fill='#555' x='8' y='0' width='8' height='8' />
			</svg>
`); //.replace(/\s+/g, ' ');
