"""Minimal logistic regression (IRLS) with numpy only. Used by analyze.py."""
import numpy as np


def fit(X, y, w=None, ridge=1e-4, iters=60, b0=None):
    """Return coefficients of a logistic regression of y on X (X includes its own intercept/dummy columns).

    w: optional non-negative observation weights (bootstrap multiplicities).
    ridge: small L2 penalty on every coefficient. It keeps the fit finite when a model
    answers every resampled question correctly (perfect separation); it shrinks estimates
    slightly toward 0, so reported effects are conservative.
    """
    X = np.asarray(X, float); y = np.asarray(y, float)
    w = np.ones(len(y)) if w is None else np.asarray(w, float)
    b = np.zeros(X.shape[1]) if b0 is None else np.array(b0, float); pen = ridge * np.eye(X.shape[1])
    for _ in range(iters):
        eta = np.clip(X @ b, -30, 30); p = 1 / (1 + np.exp(-eta))
        g = X.T @ (w * (y - p)) - pen @ b
        H = (X * (w * p * (1 - p))[:, None]).T @ X + pen
        step = np.linalg.solve(H, g)
        b = b + step
        if np.max(np.abs(step)) < 1e-6:
            break
    return b


def predict(X, b):
    return 1 / (1 + np.exp(-np.clip(np.asarray(X, float) @ b, -30, 30)))
