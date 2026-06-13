import { get } from '../../utils/request';

export function getGoodsDetailsCommentsCount(spuId = '') {
  // TODO: 后端评论接口未就绪，暂时返回空数据
  return Promise.resolve({
    badCount: 0, commentCount: 0, goodCount: 0,
    goodRate: 100, hasImageCount: 0, middleCount: 0,
  });
}

export function getGoodsDetailsCommentList(spuId = '') {
  // TODO: 后端评论接口未就绪，暂时返回空数据
  return Promise.resolve({ homePageComments: [] });
}
