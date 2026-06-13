// TODO: 后端评论接口未就绪，暂时返回空数据
export function fetchComments() {
  return Promise.resolve({ pageList: [], totalCount: 0 });
}
