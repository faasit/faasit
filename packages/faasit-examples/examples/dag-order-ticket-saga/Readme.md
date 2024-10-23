



## Intro

假设某应用为其用户提供预定火车票、航班和酒店的功能，要求三个步骤保证事务性。

该功能需要三个远程调用实现（例如预定火车票需要调用12306接口），如果三个调用都成功则该订单成功。

然而实际上任何一个远程调用都有可能会失败，因此该应用需要对不同的失败场景做出相应的补偿逻辑，回退已完成操作。

- 如果预定火车票（BuyTrainTicket）成功，而预定航班（ReserveFlight）失败，则需要取消已经购买的火车票（CancelTrainTicket），并告知您订单失败。

- 如果预定火车票（BuyTrainTicket）和预定航班（ReserveFlight）均成功，但是预订酒店（ReserveHotel）失败，则需要取消已经预定的航班（CancelFlight）和火车票（CancelTrainTicket），并告知您订单失败。

如下图所示：

![](assets/flow1.png)