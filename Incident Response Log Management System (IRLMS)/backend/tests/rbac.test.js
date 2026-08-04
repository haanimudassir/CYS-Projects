const { authorize } = require('../middleware/rbac');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('authorize() middleware', () => {
  it('calls next() when the authenticated user has an allowed role', () => {
    const req = { user: { role: 'Admin' } };
    const res = mockRes();
    const next = jest.fn();

    authorize('Admin', 'Manager')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 403 when the user role is not in the allowed list', () => {
    const req = { user: { role: 'Analyst' } };
    const res = mockRes();
    const next = jest.fn();

    authorize('Admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when there is no authenticated user on the request', () => {
    const req = {};
    const res = mockRes();
    const next = jest.fn();

    authorize('Admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows any one of several permitted roles, not just the first', () => {
    const req = { user: { role: 'Auditor' } };
    const res = mockRes();
    const next = jest.fn();

    authorize('Admin', 'Manager', 'Auditor')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
