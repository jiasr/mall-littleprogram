import { get } from '../../utils/request';

export function fetchHome() {
  return get('/v1/goods/simple-list', { pageIndex: 1, pageSize: 20 }).then((list = []) => ({
    swiper: [],
    tabList: [
      { text: '全部商品', key: 0 },
    ],
    activityImg: '',
    goodsList: list.map((item) => ({
      spuId: item.spuId,
      thumb: item.thumb,
      title: item.title,
      price: item.price,
      tags: item.tags || [],
    })),
  }));
}
