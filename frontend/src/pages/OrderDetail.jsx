import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { orderApi } from '../api';

const STATUS_LABEL = ['待支付', '已支付', '已发货', '已完成', '已取消'];

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    orderApi.detail(id).then((res) => setOrder(res.data));
  }, [id]);

  if (!order) {
    return <div className="empty-state">加载中...</div>;
  }

  return (
    <div className="form-card">
      <h1 className="form-title">订单已提交</h1>
      <div className="spec-table">
        <div className="spec-row">
          <div className="spec-row-key">订单号</div>
          <div>{order.orderNo}</div>
        </div>
        <div className="spec-row">
          <div className="spec-row-key">状态</div>
          <div>{STATUS_LABEL[order.status]}</div>
        </div>
        <div className="spec-row">
          <div className="spec-row-key">金额</div>
          <div>¥{order.totalAmount}</div>
        </div>
        <div className="spec-row">
          <div className="spec-row-key">收货人</div>
          <div>{order.receiverName} {order.receiverPhone}</div>
        </div>
        <div className="spec-row">
          <div className="spec-row-key">地址</div>
          <div>{order.receiverAddress}</div>
        </div>
      </div>
      <Link to="/products" className="btn btn-primary btn-block" style={{ marginTop: 24 }}>
        继续购物
      </Link>
    </div>
  );
}
