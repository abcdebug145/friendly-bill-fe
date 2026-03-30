export type LanguageCode = 'en' | 'vi';

export const TRANSLATIONS: Record<LanguageCode, Record<string, unknown>> = {
  en: {
    common: {
      brand: 'FriendlyBill',
      langEnglish: 'EN',
      langVietnamese: 'VI'
    },
    login: {
      heroTitle: 'Split bills smarter, never forget who owes what.',
      heroDescription:
        'Track group expenses, settle balances transparently, and keep everything in one place.',
      feature1: 'Automatic bill splitting',
      feature2: 'Track balances by group',
      feature3: 'Clear spending analytics',
      feature4: 'Payment reminders',
      heroFooter: 'Trusted by roommates, teams, and travelers.',
      badge: 'Welcome back',
      title: 'Sign in',
      subtitle: 'Enter your details to continue managing your expenses.',
      email: 'Email',
      password: 'Password',
      forgotPassword: 'Forgot password?',
      submit: 'Sign in',
      orContinueWith: 'Or continue with',
      continueWithGoogle: 'Continue with Google',
      continueWithFacebook: 'Continue with Facebook',
      noAccount: "Don't have an account?",
      goRegister: 'Create one now'
    },
    register: {
      heroTitle: 'Start managing group expenses today.',
      heroDescription:
        'Create your account to track bills, balance costs, and sync your group across devices.',
      feature1: 'Unlimited groups on basic plan',
      feature2: 'Clear and complete transaction history',
      feature3: 'Invite members with a quick link',
      heroFooter: 'No credit card required for basic plan.',
      badge: 'Create account',
      title: 'Register',
      subtitle: 'Complete the form below to get started with FriendlyBill.',
      firstName: 'First name',
      lastName: 'Last name',
      firstNamePlaceholder: 'John',
      lastNamePlaceholder: 'Doe',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm password',
      passwordPlaceholder: 'At least 8 characters',
      confirmPasswordPlaceholder: 'Re-enter your password',
      agreement: 'I agree with FriendlyBill terms of service and privacy policy.',
      orContinueWith: 'Or continue with',
      submit: 'Create account',
      hasAccount: 'Already have an account?',
      goLogin: 'Sign in'
    }
  },
  vi: {
    common: {
      brand: 'FriendlyBill',
      langEnglish: 'EN',
      langVietnamese: 'VI'
    },
    login: {
      heroTitle: 'Chia tiền thông minh, không còn nhớ ai nợ ai.',
      heroDescription:
        'Theo dõi chi tiêu nhóm, tính toán minh bạch và nhắc thanh toán nhanh gọn trong một nơi.',
      feature1: 'Tách hóa đơn tự động',
      feature2: 'Theo dõi công nợ theo nhóm',
      feature3: 'Thống kê chi tiêu trực quan',
      feature4: 'Nhắc nhở thanh toán',
      heroFooter: 'Được tin dùng bởi roommates, teams và travelers.',
      badge: 'Chào mừng trở lại',
      title: 'Đăng nhập',
      subtitle: 'Nhập thông tin để tiếp tục quản lý chi tiêu của bạn.',
      email: 'Email',
      password: 'Mật khẩu',
      forgotPassword: 'Quên mật khẩu?',
      submit: 'Đăng nhập',
      orContinueWith: 'Hoặc tiếp tục với',
      continueWithGoogle: 'Tiếp tục với Google',
      continueWithFacebook: 'Tiếp tục với Facebook',
      noAccount: 'Chưa có tài khoản?',
      goRegister: 'Đăng ký ngay'
    },
    register: {
      heroTitle: 'Bắt đầu quản lý chi tiêu nhóm ngay hôm nay.',
      heroDescription:
        'Tạo tài khoản để theo dõi hóa đơn, cân đối chi phí và đồng bộ nhóm của bạn trên mọi thiết bị.',
      feature1: 'Không giới hạn số nhóm ở gói cơ bản',
      feature2: 'Lịch sử giao dịch đầy đủ, rõ ràng',
      feature3: 'Mời thành viên bằng liên kết nhanh',
      heroFooter: 'Không cần thẻ tín dụng cho gói cơ bản.',
      badge: 'Tạo tài khoản',
      title: 'Đăng ký',
      subtitle: 'Hoàn tất thông tin bên dưới để bắt đầu với FriendlyBill.',
      firstName: 'Họ',
      lastName: 'Tên',
      firstNamePlaceholder: 'Nguyễn',
      lastNamePlaceholder: 'Văn A',
      email: 'Email',
      password: 'Mật khẩu',
      confirmPassword: 'Nhập lại mật khẩu',
      passwordPlaceholder: 'Tối thiểu 8 ký tự',
      confirmPasswordPlaceholder: 'Nhập lại mật khẩu',
      agreement: 'Tôi đồng ý với điều khoản sử dụng và chính sách bảo mật của FriendlyBill.',
      orContinueWith: 'Hoặc tiếp tục với',
      submit: 'Tạo tài khoản',
      hasAccount: 'Đã có tài khoản?',
      goLogin: 'Đăng nhập'
    }
  }
};
