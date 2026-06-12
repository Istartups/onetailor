import { Router, type IRouter } from "express";
import healthRouter from "./health";
import adminRouter from "./admin";
import licenseRouter from "./license";
import paymentRouter from "./payment";
import userRouter from "./user";
import tailoringRouter from "./tailoring";
import notificationRouter from "./notification";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(adminRouter);
router.use(licenseRouter);
router.use(paymentRouter);
router.use(userRouter);
router.use(tailoringRouter);
router.use(notificationRouter);

export default router;
