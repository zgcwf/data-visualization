const height = 1080; // 设计稿 height
const width = 1920; // 设计稿 width

// 获取宽高比例
const getScale = () => {
	const ww = window.innerWidth / width;
	const hh = window.innerHeight / height;
	const scale = ww < hh ? ww : hh;
	return scale;
};

export { getScale, width, height };
