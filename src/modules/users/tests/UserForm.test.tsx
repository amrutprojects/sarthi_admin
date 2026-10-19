import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import UserForm from '../components/UserForm';

describe('<UserForm>', () => {
  it('shows validation messages and does not submit invalid data', async () => {
    const onSubmit = vi.fn();
    render(<UserForm mode="create" onSubmit={onSubmit} onCancel={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Create user' }));
    expect(await screen.findByText('Full name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits trimmed, valid values with the selected roles', async () => {
    const onSubmit = vi.fn();
    const roles = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Viewer',
        code: 'VIEWER',
        description: null,
        isSystem: false,
        isActive: true,
        createdAt: '',
        updatedAt: '',
      },
    ];
    render(<UserForm mode="create" roles={roles} onSubmit={onSubmit} onCancel={() => {}} />);
    await userEvent.type(screen.getByLabelText('Full name'), '  Asha Patil ');
    await userEvent.type(screen.getByLabelText('Email'), 'asha@example.org');
    await userEvent.type(screen.getByLabelText('Password'), 'Strong-Pass1');
    await userEvent.click(screen.getByLabelText('Viewer'));
    await userEvent.click(screen.getByRole('button', { name: 'Create user' }));
    expect(onSubmit).toHaveBeenCalledWith(
      { name: 'Asha Patil', email: 'asha@example.org', password: 'Strong-Pass1', roleIds: [roles[0].id] },
      expect.anything(),
    );
  });

  it('shows server-side field errors (e.g. duplicate email)', () => {
    render(
      <UserForm mode="create" serverErrors={{ email: 'A user with this email already exists' }} onSubmit={() => {}} onCancel={() => {}} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('A user with this email already exists');
  });

  it('in edit mode, an empty password is allowed and labelled as "keep current"', async () => {
    const onSubmit = vi.fn();
    render(<UserForm mode="edit" defaultValues={{ name: 'Asha', email: 'asha@example.org' }} onSubmit={onSubmit} onCancel={() => {}} />);
    expect(screen.getByLabelText(/leave blank to keep/)).toHaveValue('');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(onSubmit).toHaveBeenCalled();
  });
});
